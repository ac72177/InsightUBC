import Log from "../Util";
import {IInsightFacade, InsightDataset, InsightDatasetKind, InsightError} from "./IInsightFacade";
import * as JSZip from "jszip";

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
                if ((char !== "/t") && (char !== "/n")  && (char !==  " ")) {
                    allWhiteSpace = false;
                }
            }
            if (allWhiteSpace || this.myMap.has(id)) {
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
        Log.info("line 64");
        let currentZip = new JSZip();
        return currentZip.loadAsync(content, {base64: true})
            .then((jsZip) => {
                let coursesUnzipped = jsZip.folder("courses");
                let futureFiles: Array<Promise<string>> = [];
                coursesUnzipped.forEach((relativePath, file) => {
                    let futureFile = file.async("string");
                    futureFiles.concat(futureFile);
                });
                return Promise.all(futureFiles)
                    .then((currentFiles) => {
                        return this.addToDataStructureIfValid(currentFiles)
                            .then((nestedMap) => {
                                this.myMap.set(id, nestedMap);
                                this.currentDatasets.push(id);
                                return Promise.resolve(this.currentDatasets);
                        });
                    });
            }).catch((error) => {
                return Promise.reject(new InsightError());
            });
    }

    /**
     * Turns adding to the data structure into a Promise, helper function for addDataset
     * If any errors, rejects with Insight Error
     * @param currentFiles
     * @private
     */
    private addToDataStructureIfValid(currentFiles: string[]): Promise<Map<string, string>> {
        return new Promise<Map<string, string>> ((resolve, reject) => {
            let nestedMap1 = new Map<string, string>();
            for (let JSONString of currentFiles) {
                let hasValidCourseSection: boolean = false;
                let JSONObjectCourse = JSON.parse(JSONString);
                if (JSONObjectCourse.hasOwnProperty("result")) {
                    let JSONArray = JSONObjectCourse.result;
                    for (let i of JSONArray) {
                        let JSONObjectSection = JSON.parse(JSONArray[i]);
                        let DesiredJSONString;
                        if (InsightFacade.verifyHasCorrectProperties(JSONObjectSection)) {
                            DesiredJSONString = InsightFacade.createNewJSONStringData(JSONObjectSection);
                        } else {
                            return reject(new InsightError());
                        }
                        nestedMap1.set(JSONObjectSection.id, DesiredJSONString);
                        hasValidCourseSection = true;
                    }
                } else {
                    return reject(new InsightError());
                }
            }
            return resolve(nestedMap1);
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
            && (JSONObject.Subject instanceof String)
            && (JSONObject.Avg instanceof Number)
            && (JSONObject.id instanceof Number) // becomes string
            && (JSONObject.Title instanceof String)
            && (JSONObject.Course instanceof String)
            && (JSONObject.Professor instanceof String)
            && (JSONObject.Pass instanceof Number)
            && (JSONObject.Fail instanceof Number)
            && (JSONObject.Audit instanceof Number)
            && (JSONObject.Year instanceof String); // becomes number

    }

    public removeDataset(id: string): Promise<string> {
        return Promise.reject("Not implemented.");
    }

    public performQuery(query: any): Promise<any[]> {
        return Promise.reject("Not implemented.");
    }

    public listDatasets(): Promise<InsightDataset[]> {
        return Promise.reject("Not implemented.");
    }


}
