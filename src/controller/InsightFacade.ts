import Log from "../Util";
import {IInsightFacade, InsightDataset, InsightDatasetKind, InsightError, NotFoundError} from "./IInsightFacade";
import * as JSZip from "jszip";
import {QueryObject, syntaxCheck} from "./QueryObject";
import * as fs from "fs-extra";


/**
 * This is the main programmatic entry point for the project.
 * Method documentation is in IInsightFacade
 *
 */
export default class InsightFacade implements IInsightFacade {
    private myMap: Map<string, Map<string, string>>;
    private currentDatasets: string[];
    private insightDatasetList: InsightDataset[];

    constructor() {
        if (fs.existsSync("./data/mySavedData")) {
            this.loadFromDisk("./data/mySavedData");
        } else {
            this.myMap = new Map();
            this.currentDatasets = [];
            this.insightDatasetList = [];
        }
        Log.trace("InsightFacadeImpl::init()");
    }

    private loadFromDisk(path: string) {
        let loadedData = fs.readFileSync(path).toString("utf8");
        try {
            this.myMap = new Map();
            let JSONObjectData = JSON.parse(loadedData);
            let JSONMapData = JSONObjectData.Map;
            let nestedMap: Map<string, string> = new Map();
            for (let nestedMapKey in JSONMapData) {
                let nestedMapObject = JSONMapData[nestedMapKey];
                for (let key in nestedMapObject) {
                    nestedMap.set(key, nestedMapObject[key]);
                }
                this.myMap.set(nestedMapKey, nestedMap);
            }
            this.currentDatasets = JSONObjectData.DatasetListString;
            this.insightDatasetList = JSONObjectData.InsightDatasetList;
        } catch (e) {
            Log.error("Could not load from disk");
        }
    }

    public addDataset(id: string, content: string, kind: InsightDatasetKind): Promise<string[]> {
        if (id === null || id === undefined || content === null || content === undefined || kind === null
            || kind === undefined || kind !== InsightDatasetKind.Courses) {
            return Promise.reject(new InsightError());
        }

        return this.promiseToVerifyId(id)
            .then(() => {
                if (this.myMap.has(id)) {
                    return Promise.reject(new InsightError());
                }
                return this.promiseToAddVerifiedDataset(id, content);
            });
    }

    /**
     * Turns verifying an id into a Promise
     * If there is an error, reject with an Insight Error
     */
    private promiseToVerifyId(id: string): Promise<void> {
        return new Promise<void> ((resolve, reject) => {
            let allWhiteSpace: boolean = true;
            for (let char of id) {
                if (char === "_") {
                    reject(new InsightError());
                }
                if ((char !== "\t") && (char !== "\n")  && (char !==  " ")) {
                    allWhiteSpace = false;
                }
            }
            if (allWhiteSpace) {
                reject(new InsightError());
            } else {
                resolve();
            }
        });
    }

    /**
     * Turns adding a verified dataset into a promise, helper function for addDataset
     * Rejects with Insight Error
     */
    private promiseToAddVerifiedDataset(id: string, content: string): Promise<string[]> {
        let currentZip = new JSZip();
        return new Promise<string[]>((resolve, reject) => {
            return currentZip.loadAsync(content, {base64: true})
                .then((jsZip) => {
                    let coursesUnzippedArray = jsZip.folder("courses");
                    let futureFiles: Array<Promise<string>> = [];
                    coursesUnzippedArray.forEach((relativePath, file) => {
                        futureFiles.push(file.async("string"));
                    });
                    return Promise.all(futureFiles)
                        .then((currentFiles) => {
                            return this.addToDataStructureIfValid(currentFiles)
                                .then((nestedMap) => {
                                    this.myMap.set(id, nestedMap);
                                    this.currentDatasets.push(id);
                                    const myDataset: InsightDataset = {
                                        id: id,
                                        kind: InsightDatasetKind.Courses,
                                        numRows: nestedMap.size,
                                    };
                                    this.insightDatasetList.push(myDataset);
                                    return this.writeToDisk(this.myMap, this.currentDatasets, this.insightDatasetList)
                                        .then (() => {
                                            return resolve(this.currentDatasets);
                                        });
                                });
                        });
                }).catch((error) => {
                    return reject(new InsightError());
                });
        });
    }

    /**
     * Turns adding to the data structure into a Promise, helper function for addDataset
     * If any errors, rejects with Insight Error
     */
    private addToDataStructureIfValid(currentFiles: string[]): Promise<Map<string, string>> {
        let nestedMap1 = new Map<string, string>();
        let hasValidCourseSection: boolean = false;
        return new Promise<Map<string, string>> ((resolve, reject) => {
            for (let JSONString of currentFiles) {
                try {
                    let JSONObjectCourse = JSON.parse(JSONString);
                    if (JSONObjectCourse.hasOwnProperty("result")) {
                        let myJSONArray = JSONObjectCourse.result;
                        for (let JSONObjectSection of myJSONArray) {
                            let DesiredJSONString;
                            if (InsightFacade.verifyHasCorrectProperties(JSONObjectSection)) {
                                DesiredJSONString = InsightFacade.createNewJSONCourseStringData(JSONObjectSection);
                                if (!nestedMap1.has(JSONObjectSection.id)) {
                                    nestedMap1.set(JSONObjectSection.id, DesiredJSONString);
                                    hasValidCourseSection = true;
                                }
                            }
                        }
                    }
                } catch (e) {
                    continue;
                }
            }
            if (hasValidCourseSection) {
                return resolve(nestedMap1);
            } else {
                return reject(new InsightError());
            }

        });
    }
    /**
     * Given a valid section, returns a new JSON String with the desired data
     */
    private static createNewJSONCourseStringData(JSONObjectSection: any): any {
        let year: string;
        if (JSONObjectSection.hasOwnProperty("Section") && JSONObjectSection.Section === "overall") {
            year = "1900";
        } else {
            year = JSONObjectSection.Year;
        }
        return JSON.stringify({
                Dept: JSONObjectSection.Subject,
                Avg: JSONObjectSection.Avg,
                Uuid: JSONObjectSection.id.toString(),
                Title: JSONObjectSection.Title,
                Id: JSONObjectSection.Course,
                Instructor: JSONObjectSection.Professor,
                Pass: JSONObjectSection.Pass,
                Fail: JSONObjectSection.Fail,
                Audit: JSONObjectSection.Audit,
                Year: year
        });
    }

    /**
     * Verifies if the parsed object has the correct properties and each property has the correct value
     */
    private static verifyHasCorrectProperties(JSONObject: any): boolean {
        return JSONObject.hasOwnProperty("Subject")
            && JSONObject.hasOwnProperty("Avg")
            && JSONObject.hasOwnProperty("id")
            && JSONObject.hasOwnProperty("Title")
            && JSONObject.hasOwnProperty("Course")
            && JSONObject.hasOwnProperty("Professor")
            && JSONObject.hasOwnProperty("Pass")
            && JSONObject.hasOwnProperty("Fail")
            && JSONObject.hasOwnProperty("Audit")
            && JSONObject.hasOwnProperty("Year")
            && (typeof(JSONObject.Subject) === "string")
            && (typeof(JSONObject.Avg) === "number")
            && (typeof(JSONObject.id) === "number") // becomes string
            && (typeof(JSONObject.Title) === "string")
            && (typeof(JSONObject.Course) === "string")
            && (typeof(JSONObject.Professor) === "string")
            && (typeof(JSONObject.Pass) === "number")
            && (typeof(JSONObject.Fail) === "number")
            && (typeof(JSONObject.Audit) === "number")
            && (typeof(JSONObject.Year) === "string"); // becomes number

    }

    public removeDataset(id: string): Promise<string> {
        if (id === null || id === undefined) {
            return Promise.reject(new InsightError());
        }

        return this.promiseToVerifyId(id)
            .then(() => {
                if (!this.myMap.has(id)) {
                    return Promise.reject(new NotFoundError());
                }
                this.myMap.delete(id);
                let removedIndex = this.currentDatasets.indexOf(id);
                this.currentDatasets.splice(removedIndex, 1);
                this.insightDatasetList.splice(removedIndex, 1);
                return this.writeToDisk(this.myMap, this.currentDatasets, this.insightDatasetList)
                    .then(() => {
                        return Promise.resolve("Remove Success");
                    });
            }).catch((error) => {
                return Promise.reject(new InsightError());
            });
    }

    /**
     * Write the current global variables to the disk
     */
    private writeToDisk(map: Map<string, Map<string, string>>, datasets: string[], insightDatasets: InsightDataset[]) {
        const diskData = InsightFacade.createNewJSONDiskData(map, datasets, insightDatasets);
        return fs.writeFile("./data/mySavedData", diskData);
    }

    /**
     * Given the current map, datasets, and insightDataset List, converts to a json string
     */
    private static createNewJSONDiskData(map: Map<string, Map<string, string>>, datasets: string[],
                                         insightDatasets: InsightDataset[]): string {
        let JSONMap: { [x: string]: any; } = {};
        map.forEach((value, key) => {
            let nestedJSONMap: { [x: string]: string; } = {};
            value.forEach((value1, key1) => {
                nestedJSONMap[key1] = value1;
            });
            JSONMap[key] = nestedJSONMap;
        });
        return JSON.stringify ({
            Map: JSONMap,
            DatasetListString: datasets,
            InsightDatasetList: insightDatasets,
        });
    }
    public performQuery(query: any): Promise<any[]> {

        try {
            syntaxCheck(query, this.currentDatasets);
            let queryObject: QueryObject = new QueryObject(query);
            let res: JSON[];
            res = queryObject.getQueryResults();
            return Promise.resolve(res);
        } catch (e) {
            // if (e === SyntaxError) { return Promise.reject("Invalid JSON Syntax"); }
            return Promise.reject(e); // can be either syntax error or Insight Error
        }
    }

    public testIsQueryValid(query: any): Promise<boolean> {
        try {
            syntaxCheck(query, this.currentDatasets);
            let queryObject: QueryObject = new QueryObject(query);
            queryObject.getQueryResults();
            return Promise.resolve(true);
        } catch (e) {
            return Promise.resolve(false);
        }
    }

    public listDatasets(): Promise<InsightDataset[]> {
        return Promise.resolve(this.insightDatasetList);
    }
}
