import {InsightError, NotFoundError, ResultTooLargeError} from "./IInsightFacade";

const LOGIC: string[] = ["AND", "OR"];
const MCOMPARATOR: string[] = ["GT", "EQ", "LT"];
const Mfield: string[] = ["avg", "pass", "fail", "audit", "year"];
const SCOMPARATOR: string[] = ["IS"];
const Sfield: string[] = ["dept", "id", "instructor", "title", "uuid"];
const NEG: string[] = ["NOT"];

export class QueryObjectPerformer {
    private MAX_RES_SIZE: number = 5000;
    private readonly query: any;
    private map: any;
    private uuidRes: string[] = [];
    private res: object[] = []; // initialize as an empty array


    constructor(query: any, map: any) {
        this.query = query;
        this.map = map;
        return;
    }

    /*
    Overall Strategy: When performing the filters themselves, return only the uuid of the results.
    E.g perform MComparator operation: return an array of the uuid of the selected courses
    Once all of the resulting uuids are in this.uuidRes, we run convertToRes()
    This method will take the uuids and retrieve the course objects (containing only the fields
    specified by this.query.OPTIONS), and place those objects into this.res. Afterwards, rearrange/sort
    the order of the objects according to this.query.OPTIONS.ORDER.
    */
    public getQueryResults(): object[] {
        this.uuidRes = this.performFilter(this.query.WHERE, false);
        if (this.uuidRes.length > this.MAX_RES_SIZE) {
            throw new ResultTooLargeError();
        }
        this.convertToRes();
        return this.res;
    }

    private performFilter(query: any, neg: boolean): string[] {
        let res: string[];
        const key = Object.keys(query)[0];
        if (LOGIC.includes(key)) {
            res = this.performLogic(query[key], key, neg);
        } else if (MCOMPARATOR.includes(key)) {
            res = this.performMComparator(query[key], key, neg);
        } else if (SCOMPARATOR.includes(key)) {
            res = this.performSComparator(query[key], key, neg);
        } else if (NEG.includes(key)) {
            res = this.performNeg(query[key], neg);
        } else { // error
            throw new InsightError();
        }
        return res;
    }

    private convertToRes() {
        // maps this.uuidRes to this.res according to this.query.OPTIONS
        // sorts elements of this.res according to this.query.OPTIONS.ORDER if it exists
        this.res = this.uuidRes.map((uuid) => {
            return this.map.get(uuid);
        });
        return;
    }


    private performLogic(queryArr: any, key: string, neg: boolean): string[] {
        let uuidRes: string[] = [];
        let filterRes: string[][] = []; // 2D array containing results from all filters inside logic
        for (const query of queryArr) {
            filterRes.push(this.performFilter(query, neg));
        }

        // DeMorgan
        if (neg) {
            key = (key === "AND") ? "OR" : "AND";
        }

        if (filterRes.length === 1) { return filterRes[0]; }
        switch (key) { // filterRes.length >= 2
            case "AND":
                for (const uuid0 of filterRes[0]) {
                    for (const uuid1 of filterRes[1]) {
                        if (uuid0 === uuid1) {
                            uuidRes.push(uuid0);
                        }
                    }
                }

                for (const i in filterRes) {
                    if (uuidRes.length === 0) { break; }
                    if (Number(i) < 2) { continue; }
                    for (const j in uuidRes) {
                        if (!filterRes[i].includes(uuidRes[j])) {
                            uuidRes.splice(Number(j), 1);
                        }
                    }
                }
                break;
            default: // "OR" case
                for (const i in filterRes) {
                    for (const uuid of filterRes[i]) {
                        if (!uuidRes.includes(uuid)) {
                            uuidRes.push(uuid);
                        }
                    }
                }
                break;
        }
        return uuidRes;
    }

    private performMComparator(query: any, key: string, neg: boolean): string[] {
        return [];
    }

    private performSComparator(query: any, key: string, neg: boolean): string[] {
        return [];
    }

    private performNeg(query: any, neg: boolean): string[] {
        // pass in !neg instead of an absolute truth value
        return this.performFilter(query, !neg);
    }
}
