import Log from "../Util";
import {
    IInsightFacade,
    InsightDataset,
    InsightDatasetKind,
    InsightError,
    NotFoundError,
    ResultTooLargeError
} from "./IInsightFacade";
import {QueryObject} from "./QueryObject";
import * as fs from "fs-extra";
import {CoursesDataset} from "./CoursesDataset";
import {RoomsDataset} from "./RoomsDataset";
import * as http from "http";


/**
 * This is the main programmatic entry point for the project.
 * Method documentation is in IInsightFacade
 *
 */
export default class InsightFacade implements IInsightFacade {
    private courseMap: Map<string, Map<string, string>> = new Map();
    private roomMap: Map<string, Map<string, string>> = new Map();
    private courseDS: string[] = [];
    private roomDS: string[] = [];
    private courseIns: InsightDataset[] = [];
    private roomIns: InsightDataset[] = [];

    constructor() {
        if (fs.existsSync("./data/myRoomData")) {
            this.loadFromDisk(this.roomMap, this.roomDS, this.roomIns, "./data/myRoomData");
        }
        if (fs.existsSync("./data/myCourseData")) {
            this.loadFromDisk(this.courseMap, this. courseDS, this.courseIns, "./data/myCourseData");
        }
        Log.trace("InsightFacadeImpl::init()");
    }

    private loadFromDisk(map: Map<string, Map<string, string>>, ds: string[], ins: InsightDataset[], path: string) {
        let loadedData = fs.readFileSync(path).toString("utf8");
        try {
            let JSONObjectData = JSON.parse(loadedData);
            let JSONMapData = JSONObjectData.Map;
            let nestedMap: Map<string, string> = new Map();
            for (let nestedMapKey in JSONMapData) {
                let nestedMapObject = JSONMapData[nestedMapKey];
                for (let key in nestedMapObject) {
                    nestedMap.set(key, nestedMapObject[key]);
                }
                map.set(nestedMapKey, nestedMap);
            }
            ds = JSONObjectData.DatasetListString;
            ins = JSONObjectData.InsightDatasetList;
        } catch (e) {
            Log.error("Could not load from disk");
        }
    }

    public addDataset(id: string, content: string, kind: InsightDatasetKind): Promise<string[]> {
        if (id === null || id === undefined || content === null || content === undefined || kind === null
            || kind === undefined || (kind !== InsightDatasetKind.Courses && kind !== InsightDatasetKind.Rooms)) {
            return Promise.reject(new InsightError());
        }
        return this.promiseToVerifyId(id)
            .then(() => {
                if (this.courseMap.has(id) || this.roomMap.has(id)) {
                    return Promise.reject(new InsightError()); // todo check why this fails sometimes
                }
                switch (kind) {
                    case InsightDatasetKind.Courses:
                        let coursesDataset = new CoursesDataset(this);
                        return coursesDataset.promiseToAddVerifiedDataset(id, content, kind);

                    case InsightDatasetKind.Rooms:
                        let roomsDataset = new RoomsDataset(this);
                        return roomsDataset.promiseToAddVerifiedDataset(id, content, kind);
                }
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

    public updateDataStructure(id: string, kind: InsightDatasetKind, nestedMap: Map<string, string>,
                               resolve: (value?: (PromiseLike<string[]> | string[])) => void) {
        switch (kind) {
            case InsightDatasetKind.Courses:
                this.courseMap.set(id, nestedMap);
                this.courseDS.push(id);
                const myCourseDataset: InsightDataset = {
                    id: id,
                    kind: InsightDatasetKind.Courses,
                    numRows: nestedMap.size,
                };
                this.courseIns.push(myCourseDataset);
                return this.writeToDisk(kind)
                    .then(() => {
                        let appendedList = this.courseDS.concat(this.roomDS);
                        return resolve(appendedList);
                    });

            case InsightDatasetKind.Rooms:
                this.roomMap.set(id, nestedMap);
                this.roomDS.push(id);
                const myRoomDataset: InsightDataset = {
                    id: id,
                    kind: InsightDatasetKind.Rooms,
                    numRows: nestedMap.size,
                };
                this.roomIns.push(myRoomDataset);
                return this.writeToDisk(kind)
                    .then(() => {
                        let appendedList = this.courseDS.concat(this.roomDS);
                        return resolve(appendedList);
                    });
        }
    }

    public removeDataset(id: string): Promise<string> {
        if (id === null || id === undefined) {
            return Promise.reject(new InsightError());
        }
        return this.promiseToVerifyId(id)
            .then(() => {
                if (!this.courseMap.has(id) && !this.roomMap.has(id)) {
                    return Promise.reject(new NotFoundError());
                } else if (this.courseMap.has(id)) {
                    this.courseMap.delete(id);
                    let removedIndex = this.courseDS.indexOf(id);
                    this.courseDS.splice(removedIndex, 1);
                    this.courseIns.splice(removedIndex, 1);
                    return this.writeToDisk(InsightDatasetKind.Courses)
                        .then(() => {
                            return Promise.resolve(id);
                        });
                } else {
                    this.roomMap.delete(id);
                    let removedIndex = this.roomDS.indexOf(id);
                    this.roomDS.splice(removedIndex, 1);
                    this.roomIns.splice(removedIndex, 1);
                    return this.writeToDisk(InsightDatasetKind.Rooms)
                        .then(() => {
                            return Promise.resolve(id);
                        });
                }
                return Promise.resolve(id);
            });
    }

    private writeToDisk(kind: InsightDatasetKind) {
        switch (kind) {
            case InsightDatasetKind.Courses:
                return fs.writeFile("./data/myCourseData",
                    InsightFacade.makeDiskData(this.courseMap, this.courseDS, this.courseIns));
            case InsightDatasetKind.Rooms:
                return fs.writeFile("./data/myRoomData",
                    InsightFacade.makeDiskData(this.roomMap, this.roomDS, this.roomIns));
        }
    }

    private static makeDiskData(map: Map<string, Map<string, string>>, datasets: string[],
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
            let queryObject: QueryObject = new QueryObject(query, this.courseDS, this.courseMap); // TODO add rooms
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
                    return Promise.reject(new NotFoundError());
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
            let queryObject: QueryObject = new QueryObject(query, this.courseDS, this.courseMap); // TODO add rooms
            queryObject.syntaxCheck();
            // queryObject.getQueryResults();
            return Promise.resolve(queryObject.testGetResLength());
        } catch (e) {
            return Promise.resolve(-1);
        }
    }

    public testQueryValidity(query: any): Promise<boolean> {
        try {
            let queryObject: QueryObject = new QueryObject(query, this.courseDS, this.courseMap); // TODO add rooms
            queryObject.syntaxCheck();
            // queryObject.getQueryResults();
            // return Promise.resolve(queryObject.testGetResLength());
            return Promise.resolve(true);
        } catch (e) {
            // return Promise.resolve(-1);
            return Promise.resolve(false);
        }
    }

    public listDatasets(): Promise<InsightDataset[]> {
        let appendedList = this.roomIns.concat(this.courseIns);
        return Promise.resolve(appendedList);
    }
}
