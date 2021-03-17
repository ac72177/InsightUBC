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

/**
 * This is the main programmatic entry point for the project.
 * Method documentation is in IInsightFacade
 *
 */
export default class InsightFacade implements IInsightFacade {
    private courseMap: Map<string, Map<string, string>> = new Map();
    private roomMap: Map<string, Map<string, string>> = new Map();
    private currentDatasets: string[];
    private currentInsightList: InsightDataset[];
    private courseDS: string[] = [];
    private roomDS: string[] = [];

    constructor() {
        if (fs.existsSync("./data/myRoomData")) {
            this.loadMapFromDisk(this.roomMap, InsightDatasetKind.Rooms, "./data/myRoomData");
        }
        if (fs.existsSync("./data/myCourseData")) {
            this.loadMapFromDisk(this.courseMap, InsightDatasetKind.Courses, "./data/myCourseData");
        }
        if (fs.existsSync("./data/myListData")) {
            this.loadListsFromDisk("./data/myListData");
        } else {
            this.currentDatasets = [];
            this.currentInsightList = [];
        }
        Log.trace("InsightFacadeImpl::init()");
    }

    private loadMapFromDisk(map: Map<string, Map<string, string>>, kind: InsightDatasetKind, path: string) {
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
            switch (kind) {
                case InsightDatasetKind.Courses:
                    this.courseDS = JSONObjectData.DatasetListString;
                case InsightDatasetKind.Rooms:
                    this.roomDS = JSONObjectData.DatasetListString;
            }
        } catch (e) {
            Log.error("Could not load map from disk");
        }
    }

    private loadListsFromDisk(path: string) {
        let loadedData = fs.readFileSync(path).toString("utf8");
        try {
            let JSONObjectData = JSON.parse(loadedData);
            this.currentDatasets = JSONObjectData.DatasetListString;
            this.currentInsightList = JSONObjectData.InsightDatasetList;
        } catch (e) {
            Log.error("Could not load lists from disk");
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
                    return Promise.reject(new InsightError());
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
                this.currentDatasets.push(id);
                const myCourseDataset: InsightDataset = {
                    id: id,
                    kind: InsightDatasetKind.Courses,
                    numRows: nestedMap.size,
                };
                this.currentInsightList.push(myCourseDataset);
                return this.writeToDisk(kind)
                    .then(() => {
                        return resolve(this.currentDatasets);
                    });

            case InsightDatasetKind.Rooms:
                this.roomMap.set(id, nestedMap);
                this.roomDS.push(id);
                this.currentDatasets.push(id);
                const myRoomDataset: InsightDataset = {
                    id: id,
                    kind: InsightDatasetKind.Rooms,
                    numRows: nestedMap.size,
                };
                this.currentInsightList.push(myRoomDataset);
                return this.writeToDisk(kind)
                    .then(() => {
                        return resolve(this.currentDatasets);
                    });
        }
    }

    public removeDataset(id: string): Promise<string> {
        if (id === null || id === undefined) {
            return Promise.reject(new InsightError());
        }
        return this.promiseToVerifyId(id)
            .then(() => {
                let removedIndex = this.currentDatasets.indexOf(id);
                if (!this.courseMap.has(id) && !this.roomMap.has(id)) {
                    return Promise.reject(new NotFoundError());
                } else if (this.courseMap.has(id)) {
                    this.courseMap.delete(id);
                    this.courseDS.splice(this.courseDS.indexOf(id), 1);
                    this.currentDatasets.splice(removedIndex, 1);
                    this.currentInsightList.splice(removedIndex, 1);
                    return this.writeToDisk(InsightDatasetKind.Courses)
                        .then(() => {
                            return Promise.resolve(id);
                        });
                } else {
                    this.roomMap.delete(id);
                    this.roomDS.splice(this.courseDS.indexOf(id), 1);
                    this.currentDatasets.splice(removedIndex, 1);
                    this.currentInsightList.splice(removedIndex, 1);
                    return this.writeToDisk(InsightDatasetKind.Rooms)
                        .then(() => {
                            return Promise.resolve(id);
                        });
                }
                return Promise.resolve(id);
            });
    }

    private writeToDisk(kind: InsightDatasetKind): Promise<void> {
        switch (kind) {
            case InsightDatasetKind.Courses:
                return fs.writeFile("./data/myCourseData", InsightFacade.makeMapDiskData(this.courseMap, this.courseDS))
                    .then(() => {
                        return this.writeListsToDisk();
                    });
            case InsightDatasetKind.Rooms:
                return fs.writeFile("./data/myRoomData", InsightFacade.makeMapDiskData(this.roomMap, this.roomDS))
                    .then(() => {
                        return this.writeListsToDisk();
                    });
        }
    }

    private writeListsToDisk(): Promise<void> {
        return fs.writeFile("./data/myListData", InsightFacade.makeListsDiskData(this.currentDatasets,
                                                                                    this.currentInsightList));
    }

    private static makeMapDiskData(map: Map<string, Map<string, string>>, ds: string[]): string {
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
            DatasetListString: ds,
        });
    }

    private static makeListsDiskData(datasets: string[], insightDatasets: InsightDataset[]): string {
        return JSON.stringify ({
            DatasetListString: datasets,
            InsightDatasetList: insightDatasets,
        });
    }

    public performQuery(query: any): Promise<any[]> {
        try {
            let queryObject: QueryObject = new QueryObject(query, this.courseDS, this.courseMap,
                this.roomDS, this.roomMap);
            // let queryObject: QueryObject = new QueryObject(query, this.currentDatasets, this.courseMap);
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
            let queryObject: QueryObject = new QueryObject(query, this.courseDS, this.courseMap,
                this.roomDS, this.roomMap);
            // let queryObject: QueryObject = new QueryObject(query, this.currentDatasets, this.courseMap);
            queryObject.syntaxCheck();
            // queryObject.getQueryResults();
            return Promise.resolve(queryObject.testGetResLength());
        } catch (e) {
            return Promise.resolve(-1);
        }
    }

    public testQueryValidity(query: any): Promise<boolean> {
        try {
            let queryObject: QueryObject = new QueryObject(query, this.courseDS, this.courseMap,
                this.roomDS, this.roomMap);
            // let queryObject: QueryObject = new QueryObject(query, this.currentDatasets, this.courseMap);
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
        return Promise.resolve(this.currentInsightList);
    }
}
