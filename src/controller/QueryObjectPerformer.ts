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

    // TODO: Adrea implement this method if you have time
    // this.uuidRes is a string[] containing the uuid of the results.
    // we want to get the actual objects of those uuid and store them in this.res ^^
    private convertToRes() {
        // maps this.uuidRes to this.res according to this.query.OPTIONS
        // sorts elements of this.res according to this.query.OPTIONS.ORDER if it exists
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
            let key = this.query.OPTIONS.ORDER;
            this.res.sort((obj1: any, obj2: any) => {
                return obj2[key] - obj1[key];
            });
            this.res.reverse();
        }
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
        let uuidRes: string[] = [];
        let mkey: string = Object.keys(query)[0];
        let mfield: string = mkey.split("_")[1];
        let val: number = query[mkey];
        switch (key) {
            case "GT":
                if (neg) {
                    this.map.forEach((obj: any, uuid: string) => {
                        obj = JSON.parse(obj);
                        if (obj[mfield] <= val) { uuidRes.push(uuid); }
                    });
                } else {
                    this.map.forEach((obj: any, uuid: string) => {
                        obj = JSON.parse(obj);
                        if (obj[mfield] > val) { uuidRes.push(uuid); }
                    });
                }
                break;
            case "EQ":
                if (neg) {
                    this.map.forEach((obj: any, uuid: string) => {
                        obj = JSON.parse(obj);
                        if (obj[mfield] !== val) { uuidRes.push(uuid); }
                    });
                } else {
                    this.map.forEach((obj: any, uuid: string) => {
                        obj = JSON.parse(obj);
                        if (obj[mfield] === val) { uuidRes.push(uuid); }
                    });
                }
                break;
            case "LT":
                if (neg) {
                    this.map.forEach((obj: any, uuid: string) => {
                        obj = JSON.parse(obj);
                        if (obj[mfield] >= val) { uuidRes.push(uuid); }
                    });
                } else {
                    this.map.forEach((obj: any, uuid: string) => {
                        obj = JSON.parse(obj);
                        if (obj[mfield] < val) { uuidRes.push(uuid); }
                    });
                }
                break;
            default:
                break;
        }
        return uuidRes;
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
            if (regex.test(obj[sfield]) !== neg) { uuidRes.push(uuid); }
        });
        return uuidRes;
    }

    private performNeg(query: any, neg: boolean): string[] {
        // pass in !neg instead of an absolute truth value
        return this.performFilter(query, !neg);
    }
}
