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
    /**
     * Add a dataset to insightUBC. delete this later // todo
     *
     * @param id  The id of the dataset being added. Follows the format /^[^_]+$/
     * @param content  The base64 content of the dataset. This content should be in the form of a serialized zip file.
     * @param kind  The kind of the dataset
     *
     * @return Promise <string[]>
     *
     * The promise should fulfill on a successful add, reject for any failures.
     * The promise should fulfill with a string array,
     * containing the ids of all currently added datasets upon a successful add.
     * The promise should reject with an InsightError describing the error.
     *
     * An id is invalid if it contains an underscore, or is only whitespace characters.
     * If id is the same as the id of an already added dataset, the dataset should be rejected and not saved.
     *
     * After receiving the dataset, it should be processed into a data structure of
     * your design. The processed data structure should be persisted to disk; your
     * system should be able to load this persisted value into memory for answering
     * queries.
     *
     * Ultimately, a dataset must be added or loaded from disk before queries can
     * be successfully answered.
     */
    public addDataset(id: string, content: string, kind: InsightDatasetKind): Promise<string[]> {
        if (id === null || id === undefined || content === null || content === undefined || kind === null
            || kind === undefined || kind !== InsightDatasetKind.Courses) {
            return Promise.reject(new InsightError());
        }

        return this.promiseToVerifyId(id)
            .then(() => {
                return this.promiseToAddVerifiedDataset(content);
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
     * Turns verifying a dataset into a promise, adds the dataset to currentDatasets
     * If there is an error, reject it with an InsightError, JSZip content will go here
     * @param content
     */
    private promiseToAddVerifiedDataset(content: string): Promise<any> {
        let currentZip = new JSZip();
        return currentZip.loadAsync(content)
            .then((jsZip) => {
                let coursesUnzipped = jsZip.folder("courses");
                let futureFiles: Array<Promise<string>> = [];
                coursesUnzipped.forEach((relativePath, file) => {
                    let futureFile = file.async("string");
                    futureFiles.concat(futureFile);
                });
                return Promise.all(futureFiles).then((currentFiles) => {
                    // manually parse
                });
            });
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
