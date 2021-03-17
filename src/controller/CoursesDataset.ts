import * as JSZip from "jszip";
import {InsightDataset, InsightDatasetKind, InsightError} from "./IInsightFacade";
import InsightFacade from "./InsightFacade";

export class CoursesDataset {
    private myInsightFacade: InsightFacade;
    constructor(param: InsightFacade) {
        this.myInsightFacade = param;
    }

    public promiseToAddVerifiedDataset(id: string, content: string, kind: InsightDatasetKind): Promise<string[]> {
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
                            return this.updateDataStructure(currentFiles, id, kind, resolve);
                        });
                }).catch((error) => {
                    return reject(new InsightError());
                });
        });
    }

    private updateDataStructure(currentFiles: string[],
                                id: string, kind: InsightDatasetKind,
                                resolve: (value?: (PromiseLike<string[]> | string[])) => void) {
        return this.addToDataStructureIfValid(currentFiles)
            .then((nestedMap) => {
                return this.myInsightFacade.updateDataStructure(id, kind, nestedMap, resolve);
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
                            if (CoursesDataset.verifyHasCorrectProperties(JSONObjectSection)) {
                                DesiredJSONString = CoursesDataset.createNewJSONCourseStringData(JSONObjectSection);
                                if (!nestedMap1.has(JSONObjectSection.id.toString())) {
                                    nestedMap1.set(JSONObjectSection.id.toString(), DesiredJSONString);
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

    private static createNewJSONCourseStringData(JSONObjectSection: any): any {
        let year: string;
        if (JSONObjectSection.hasOwnProperty("Section") && JSONObjectSection.Section === "overall") {
            year = "1900";
        } else {
            year = JSONObjectSection.Year;
        }
        return JSON.stringify({
            dept: JSONObjectSection.Subject,
            avg: JSONObjectSection.Avg,
            uuid: JSONObjectSection.id.toString(),
            title: JSONObjectSection.Title,
            id: JSONObjectSection.Course,
            instructor: JSONObjectSection.Professor,
            pass: JSONObjectSection.Pass,
            fail: JSONObjectSection.Fail,
            audit: JSONObjectSection.Audit,
            year: Number(year)
        });
    }

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
}
