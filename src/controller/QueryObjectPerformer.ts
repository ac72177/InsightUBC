import {InsightError, NotFoundError, ResultTooLargeError} from "./IInsightFacade";
import {stringify} from "querystring";
import {QueryFields} from "./QueryFields";
import {QueryObjectTransfPerformer} from "./QueryObjectTransfPerformer";

const LOGIC: string[] = ["AND", "OR"];
const MCOMPARATOR: string[] = ["GT", "EQ", "LT"];
const SCOMPARATOR: string[] = ["IS"];
const NEG: string[] = ["NOT"];

export class QueryObjectPerformer {
    private MAX_RES_SIZE: number = 5000;
    private readonly query: any;
    private readonly map: any;
    private uuidRes: string[] = [];
    private res: object[] = []; // initialize as an empty array
    private fieldChecker: QueryFields;


    constructor(query: any, map: any, fieldChecker: QueryFields) {
        this.query = query;
        this.map = map;
        this.fieldChecker = fieldChecker;
        return;
    }

    public getQueryResults(): object[] {
        if (Object.keys(this.query.WHERE).length === 0) {
            this.map.forEach((obj: any, uuid: string) => {
                this.uuidRes.push(uuid.toString());
            });
        } else {
            this.uuidRes = this.performFilter(this.query.WHERE, false);
        }
        if (this.query.hasOwnProperty("TRANSFORMATIONS")) {
            let queryObjTransfPerformer = new QueryObjectTransfPerformer(this.query.TRANSFORMATIONS, this.query.OPTIONS,
                this.map, this.uuidRes, this.fieldChecker);
            return queryObjTransfPerformer.performTransformation();
        }

        if (this.uuidRes.length > this.MAX_RES_SIZE) {
            throw new ResultTooLargeError();
        }
        this.convertToRes();
        return this.res;
    }

    // TODO: comment out this test method after finish testing
    public testGetResLength(): number {
        this.uuidRes = this.performFilter(this.query.WHERE, false);
        if (this.uuidRes.length > this.MAX_RES_SIZE) {
            throw new ResultTooLargeError();
        }
        return this.uuidRes.length;
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
        this.res = this.uuidRes.map((uuid) => {
            let obj = JSON.parse(this.map.get(uuid));
            let ret: any = {};
            for (const key of this.query.OPTIONS.COLUMNS) {
                let field = key.split("_")[1];
                ret[key] = obj[field];
            }
            return ret;
        });

        if (this.query.OPTIONS.hasOwnProperty("ORDER")) {
            if (typeof this.query.OPTIONS.ORDER === "string") {
                this.performOrderSortString();
            } else { // ORDER must be an object
                this.performOrderSortObj();
            }
        }
        return;
    }

    private performOrderSortString() { // only runs when there are no TRANSFORMATIONS
        let key = this.query.OPTIONS.ORDER;
        let field = key.split("_")[1];
        // TODO: account for rooms fields in the line below
        if (this.fieldChecker.includesMField(field) || field === "id" || field === "uuid") {
            this.res.sort((obj1: any, obj2: any) => {
                return obj1[key] - obj2[key];
            });
        } else {
            this.res.sort((obj1: any, obj2: any) => {
                return obj1[key] > obj2[key] ? 1 : -1;
            });
        }
    }

    private performOrderSortObj() {
        let dir: string = this.query.OPTIONS.ORDER["dir"];
        let keys: string[] = this.query.OPTIONS.ORDER["keys"];
        this.res.sort((obj1: any, obj2: any) => {
            let key: string = keys[keys.length - 1]; // set the sort key default to the last key
            for (const i in keys) {
                if (obj1[keys[i]] !== obj2[keys[i]]) {
                    key = keys[i];
                    break;
                }
            }
            if (this.isNumeric(key)) {
                if (dir === "UP") { // TODO: write tests for this. Maybe change the minus signs to "<"?
                    return obj1[key] - obj2[key];
                } else {
                    return obj2[key] - obj1[key];
                }
            } else { // not a numeric key
                if (dir === "UP") {
                    return obj1[key] > obj2[key] ? 1 : -1;
                } else {
                    return obj1[key] < obj2[key] ? 1 : -1;
                }
            }
        });
    }

    private isNumeric(field: string): boolean {
        return this.fieldChecker.includesMField(field) || field === "id" || field === "uuid";
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

        if (filterRes.length === 1) {
            return filterRes[0];
        }
        switch (key) { // filterRes.length >= 2
            case "AND":
                for (const uuid0 of filterRes[0]) {
                    if (filterRes[1].includes(uuid0)) {
                        uuidRes.push(uuid0);
                    }
                }

                for (const i in filterRes) {
                    if (uuidRes.length === 0) {
                        break;
                    }
                    // if (Number(i) < 2) {
                    //     continue;
                    // }
                    let j = 0;
                    while (j < uuidRes.length) {
                        if (!filterRes[i].includes(uuidRes[j])) {
                            uuidRes.splice(Number(j), 1);
                            j--;
                        }
                        j++;
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
        let uuidRes: string[] = [];
        let mkey: string = Object.keys(query)[0];
        let mfield: string = mkey.split("_")[1];
        let val: number = query[mkey];
        switch (key) {
            case "GT":
                this.performMComparatorGT(mfield, uuidRes, neg, val);
                break;
            case "EQ":
                if (neg) {
                    this.map.forEach((obj: any, uuid: string) => {
                        obj = JSON.parse(obj);
                        if (obj[mfield] !== val) {
                            uuidRes.push(uuid);
                        }
                    });
                } else {
                    this.map.forEach((obj: any, uuid: string) => {
                        obj = JSON.parse(obj);
                        if (obj[mfield] === val) {
                            uuidRes.push(uuid);
                        }
                    });
                }
                break;
            case "LT":
                if (neg) {
                    this.map.forEach((obj: any, uuid: string) => {
                        obj = JSON.parse(obj);
                        if (obj[mfield] >= val) {
                            uuidRes.push(uuid);
                        }
                    });
                } else {
                    this.map.forEach((obj: any, uuid: string) => {
                        obj = JSON.parse(obj);
                        if (obj[mfield] < val) {
                            uuidRes.push(uuid);
                        }
                    });
                }
                break;
            default:
                break;
        }
        return uuidRes;
    }

    // The only purpose of this method is so that Lint stops complaining. Originally, it was just
    // the GT case of this.performMComparator. =_=
    private performMComparatorGT(mfield: string, uuidRes: any, neg: boolean, val: number) {
        if (neg) {
            this.map.forEach((obj: any, uuid: string) => {
                obj = JSON.parse(obj);
                if (obj[mfield] <= val) {
                    uuidRes.push(uuid);
                }
            });
        } else {
            this.map.forEach((obj: any, uuid: string) => {
                obj = JSON.parse(obj);
                if (obj[mfield] > val) {
                    uuidRes.push(uuid);
                }
            });
        }
    }

    private performSComparator(query: any, key: string, neg: boolean): string[] {
        let uuidRes: string[] = [];
        let skey: string = Object.keys(query)[0];
        let sfield: string = skey.split("_")[1];
        let str: string = query[skey];
        // escaping the string as necessary. line of code from
        // https://developer.mozilla.org/en-US/docs/Web/JavaScript/Guide/Regular_Expressions
        str = str.replace(/[.+?^${}()|[\]\\]/g, "\\$&");

        // regex expression from
        // https://stackoverflow.com/questions/52143451/javascript-filter-with-wildcard
        let regex = new RegExp("^" + str.replace(/\*/g, ".*") + "$");

        this.map.forEach((obj: any, uuid: string) => {
            if (regex.test( JSON.parse(obj)[sfield]) !== neg) {
                uuidRes.push(uuid);
            }
        });
        return uuidRes;
    }

    private performNeg(query: any, neg: boolean): string[] {
        // pass in !neg instead of an absolute truth value
        return this.performFilter(query, !neg);
    }
}
