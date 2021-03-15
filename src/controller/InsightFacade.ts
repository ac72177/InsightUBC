import Log from "../Util";
import { IInsightFacade, InsightDataset, InsightDatasetKind, InsightError, NotFoundError, ResultTooLargeError
} from "./IInsightFacade";
import * as JSZip from "jszip";
import {QueryObject} from "./QueryObject";
import * as fs from "fs-extra";
import {CoursesDataset} from "./CoursesDataset";


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
                let coursesDataset = new CoursesDataset(this);
                return coursesDataset.promiseToAddVerifiedDataset(id, content);
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

    // /**
    //  * Turns adding a verified dataset into a promise, helper function for addDataset
    //  * Rejects with Insight Error
    //  */
    // private promiseToAddVerifiedDataset(id: string, content: string): Promise<string[]> {
    //     let currentZip = new JSZip();
    //     return new Promise<string[]>((resolve, reject) => {
    //         return currentZip.loadAsync(content, {base64: true})
    //             .then((jsZip) => {
    //                 let coursesUnzippedArray = jsZip.folder("courses");
    //                 let futureFiles: Array<Promise<string>> = [];
    //                 coursesUnzippedArray.forEach((relativePath, file) => {
    //                     futureFiles.push(file.async("string"));
    //                 });
    //                 return Promise.all(futureFiles)
    //                     .then((currentFiles) => {
    //                         return this.updateDataStructure(currentFiles, id, resolve);
    //                     });
    //             }).catch((error) => {
    //                 return reject(new InsightError());
    //             });
    //     });
    // }
    //
    public updateDataStructure(id: string, nestedMap: Map<string, string>,
                               resolve: (value?: (PromiseLike<string[]> | string[])) => void) {
                this.myMap.set(id, nestedMap);
                this.currentDatasets.push(id);
                const myDataset: InsightDataset = {
                    id: id,
                    kind: InsightDatasetKind.Courses,
                    numRows: nestedMap.size,
                };
                this.insightDatasetList.push(myDataset);
                return this.writeToDisk(this.myMap, this.currentDatasets, this.insightDatasetList)
                    .then(() => {
                        return resolve(this.currentDatasets);
                    });
    }
    //
    // /**
    //  * Turns adding to the data structure into a Promise, helper function for addDataset
    //  * If any errors, rejects with Insight Error
    //  */
    // private addToDataStructureIfValid(currentFiles: string[]): Promise<Map<string, string>> {
    //     let nestedMap1 = new Map<string, string>();
    //     let hasValidCourseSection: boolean = false;
    //     return new Promise<Map<string, string>> ((resolve, reject) => {
    //         for (let JSONString of currentFiles) {
    //             try {
    //                 let JSONObjectCourse = JSON.parse(JSONString);
    //                 if (JSONObjectCourse.hasOwnProperty("result")) {
    //                     let myJSONArray = JSONObjectCourse.result;
    //                     for (let JSONObjectSection of myJSONArray) {
    //                         let DesiredJSONString;
    //                         if (InsightFacade.verifyHasCorrectProperties(JSONObjectSection)) {
    //                             DesiredJSONString = InsightFacade.createNewJSONCourseStringData(JSONObjectSection);
    //                             if (!nestedMap1.has(JSONObjectSection.id)) {
    //                                 nestedMap1.set(JSONObjectSection.id, DesiredJSONString);
    //                                 hasValidCourseSection = true;
    //                             }
    //                         }
    //                     }
    //                 }
    //             } catch (e) {
    //                 continue;
    //             }
    //         }
    //         if (hasValidCourseSection) {
    //             return resolve(nestedMap1);
    //         } else {
    //             return reject(new InsightError());
    //         }
    //
    //     });
    // }
    //
    // private static createNewJSONCourseStringData(JSONObjectSection: any): any {
    //     let year: string;
    //     if (JSONObjectSection.hasOwnProperty("Section") && JSONObjectSection.Section === "overall") {
    //         year = "1900";
    //     } else {
    //         year = JSONObjectSection.Year;
    //     }
    //     return JSON.stringify({
    //         dept: JSONObjectSection.Subject,
    //         avg: JSONObjectSection.Avg,
    //         uuid: JSONObjectSection.id.toString(),
    //         title: JSONObjectSection.Title,
    //         id: JSONObjectSection.Course,
    //         instructor: JSONObjectSection.Professor,
    //         pass: JSONObjectSection.Pass,
    //         fail: JSONObjectSection.Fail,
    //         audit: JSONObjectSection.Audit,
    //         year: Number(year)
    //     });
    // }
    //
    // private static verifyHasCorrectProperties(JSONObject: any): boolean {
    //     return JSONObject.hasOwnProperty("Subject")
    //         && JSONObject.hasOwnProperty("Avg")
    //         && JSONObject.hasOwnProperty("id")
    //         && JSONObject.hasOwnProperty("Title")
    //         && JSONObject.hasOwnProperty("Course")
    //         && JSONObject.hasOwnProperty("Professor")
    //         && JSONObject.hasOwnProperty("Pass")
    //         && JSONObject.hasOwnProperty("Fail")
    //         && JSONObject.hasOwnProperty("Audit")
    //         && JSONObject.hasOwnProperty("Year")
    //         && (typeof(JSONObject.Subject) === "string")
    //         && (typeof(JSONObject.Avg) === "number")
    //         && (typeof(JSONObject.id) === "number") // becomes string
    //         && (typeof(JSONObject.Title) === "string")
    //         && (typeof(JSONObject.Course) === "string")
    //         && (typeof(JSONObject.Professor) === "string")
    //         && (typeof(JSONObject.Pass) === "number")
    //         && (typeof(JSONObject.Fail) === "number")
    //         && (typeof(JSONObject.Audit) === "number")
    //         && (typeof(JSONObject.Year) === "string"); // becomes number
    //
    // }

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
                        return Promise.resolve(id);
                    });
                return Promise.resolve(id);
            });
    }

    private writeToDisk(map: Map<string, Map<string, string>>, datasets: string[], insightDatasets: InsightDataset[]) {
        const diskData = InsightFacade.createNewJSONDiskData(map, datasets, insightDatasets);
        return fs.writeFile("./data/mySavedData", diskData);
    }

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
            let queryObject: QueryObject = new QueryObject(query, this.currentDatasets, this.myMap);
            queryObject.syntaxCheck();
            let res: object[];
            res = queryObject.getQueryResults();
            return Promise.resolve(res);
        } catch (e) {
            // if (e === SyntaxError) { return Promise.reject("Invalid JSON Syntax"); }
            switch (e.message) {
                case "InsightError":
                    return Promise.reject(new InsightError());
                    break;
                case "NotFoundError":
                    return Promise.reject(new NotFoundError()); // TODO: Should be NotFoundError()?
                    break;
                case "ResultTooLargeError":
                    return Promise.reject(new ResultTooLargeError());
                    break;
                default:
                    throw e;
            }
        }
    }

    public testQueryResLength(query: any): Promise<number> {
        try {
            let queryObject: QueryObject = new QueryObject(query, this.currentDatasets, this.myMap);
            queryObject.syntaxCheck();
            // queryObject.getQueryResults();
            return Promise.resolve(queryObject.testGetResLength());
        } catch (e) {
            return Promise.resolve(-1);
        }
    }

    public listDatasets(): Promise<InsightDataset[]> {
        return Promise.resolve(this.insightDatasetList);
    }
}
