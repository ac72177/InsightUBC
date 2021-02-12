import Log from "../Util";
import {IInsightFacade, InsightDataset, InsightDatasetKind, InsightError, NotFoundError} from "./IInsightFacade";
import * as JSZip from "jszip";
import {QueryObject, semanticsCheck, syntaxCheck} from "./QueryObject";


/**
 * This is the main programmatic entry point for the project.
 * Method documentation is in IInsightFacade
 *
 */
export default class InsightFacade implements IInsightFacade {
    private myMap: any;
    private currentDatasets: string[];

    constructor() {
        this.myMap = new Map();
        this.currentDatasets = [];
        Log.trace("InsightFacadeImpl::init()");
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
     * @param id
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
     * @param id
     * @param content
     * @private
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
                                    return resolve(this.currentDatasets);
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
     * @param currentFiles
     * @private
     */
    private addToDataStructureIfValid(currentFiles: string[]): Promise<Map<string, string>> {
        let nestedMap1 = new Map<string, string>();
        let hasValidCourseSection: boolean = false;
        return new Promise<Map<string, string>> ((resolve, reject) => {
            for (let JSONString of currentFiles) {
                let JSONObjectCourse = JSON.parse(JSONString);
                if (JSONObjectCourse.hasOwnProperty("result")) {
                    let myJSONArray = JSONObjectCourse.result;
                    for (let JSONObjectSection of myJSONArray) {
                        let DesiredJSONString;
                        if (InsightFacade.verifyHasCorrectProperties(JSONObjectSection)) {
                            DesiredJSONString = InsightFacade.createNewJSONStringData(JSONObjectSection);
                            if (!nestedMap1.has(JSONObjectSection.id)) {
                                nestedMap1.set(JSONObjectSection.id, DesiredJSONString);
                                hasValidCourseSection = true;
                            }
                        }
                    }
                } else {
                    return reject(new InsightError());
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
     * @param JSONObjectSection
     * @private
     */
    private static createNewJSONStringData(JSONObjectSection: any): any {
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
     * @param JSONObject
     * @private
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
                return Promise.resolve("Remove Success");
            });
    }

    public performQuery(query: any): Promise<any[]> {
        // I think query can only be either a JSON or a string
        let localQuery: string = query;
        let jsonQuery: JSON;

        try {
            jsonQuery = JSON.parse(localQuery);
            syntaxCheck(jsonQuery);
            semanticsCheck(jsonQuery);
        } catch (e) {
            // if (e === SyntaxError) { return Promise.reject("Invalid JSON Syntax"); }
            return Promise.reject(e); // can be either syntax error or Insight Error
        }


        let queryObject: QueryObject = new QueryObject(jsonQuery);

        let res: JSON[];
        try {
            res = queryObject.getQueryResults();
        } catch (e) {
            return Promise.reject(e); // ResultTooLargeError thrown from queryObject
        }

        return Promise.resolve(res);
    }

    public listDatasets(): Promise<InsightDataset[]> {
        return Promise.reject("Not implemented.");
    }


}
