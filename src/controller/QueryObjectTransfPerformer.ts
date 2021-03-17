import {QueryFields} from "./QueryFields";
import {ResultTooLargeError} from "./IInsightFacade";
import Decimal from "decimal.js";

export class QueryObjectTransfPerformer {
    private MAX_RES_SIZE: number = 5000;
    private queryTransf: any;
    private queryOptions: any;
    private map: any;
    private uuidRes: string[];
    private fieldChecker: QueryFields;
    private finalRes: object[];
    private groupArr: string[][] = [];
    private groupKeys: string[] = [];
    private applyKeys: string[] = [];

    constructor(transfQuery: any, queryOptions: any, map: any, uuidRes: string[], fieldChecker: QueryFields) {
        this.queryTransf = transfQuery;
        this.queryOptions = queryOptions;
        this.map = map;
        this.uuidRes = uuidRes;
        this.fieldChecker = fieldChecker;
        return;
    }

    // TODO: Implement this method
    // TODO: throw result too large error if too many columns
    public performTransformation(): object[] {
        this.getGroupAndApplyKeys();
        this.makeGroups();
        if (this.groupArr.length > this.MAX_RES_SIZE) {
            throw new ResultTooLargeError();
        }
        this.performApply();
        this.performGroupKeys();
        if (this.queryOptions.hasOwnProperty("ORDER")) {
            if (typeof this.queryOptions.ORDER === "string") {
                this.performOrderSortString();
            } else { // ORDER must be an object
                this.performOrderSortObj();
            }
        }
        return this.finalRes;
    }

    // fills in groupkeys and applykeys
    private getGroupAndApplyKeys() {
        this.groupKeys = this.queryTransf["GROUP"];
        this.applyKeys = this.queryTransf["APPLY"].map((obj: any) => {
            return Object.keys(obj)[0];
        });
        return;
    }

    // After finishing, this.groupArr should be a 2D array, each inner array representing a group
    private makeGroups() {
        this.groupArr.push(this.uuidRes);
        for (const wholeKey of this.queryTransf["GROUP"]) {
            let key = wholeKey.split("_")[1];
            this.makeGroupHelper(key);
        }
        return;
    }

    private makeGroupHelper(key: string) {
        let finalGroup: string[][] = [];
        for (const innerArr of this.groupArr) {
            let temp: any[] = innerArr.map((uuid: string) => {
                return JSON.parse(this.map.get(Number(uuid)))[key]; // TODO: look into why casting to number is need
                // TODO: (cont.) here, but no other files. Source of bug in other files?
            });
            let unique: any[] = temp.filter(this.onlyUnique); // stackoverflow link for this line below
            let resArr: string[][] = [];
            for (const j in unique) {
                resArr.push([]);
            }
            for (const j in temp) {
                let index: number = unique.indexOf(temp[j]);
                resArr[index].push(innerArr[j]);
            }
            for (const j in unique) {
                finalGroup.push(resArr[j]);
            }
        }
        this.groupArr = finalGroup;
    }

    // get unique elements functionality from
    // https://stackoverflow.com/questions/1960473/get-all-unique-values-in-a-javascript-array-remove-duplicates
    private onlyUnique(value: any, index: any, self: any) {
        return self.indexOf(value) === index;
    }

    // for each array in this.groupArr, perform APPLY operations and put the result in finalRes
    private performApply() {
        this.finalRes = this.groupArr.map((group: string[]) => {
            let ret: any = {};
            for (const applyObj of this.queryTransf["APPLY"]) {
                let applyKey: string = Object.keys(applyObj)[0];
                let applyRes: any = this.performApplyElem(group, applyObj[applyKey]);
                ret[applyKey] = applyRes;
            }
            return ret;
        });
        return;
    }

    // get the applyToken and the key. Do the apply, return the result
    private performApplyElem(group: string[], applyElem: any): any {
        let applyToken: string = Object.keys(applyElem)[0];
        let key: string = applyElem[applyToken];
        key = key.split("_")[1];
        let mappedGroup: any[] = group.map((str: string) => {
            return JSON.parse(this.map.get(Number(str)))[key];
        });
        switch (applyToken) {
            case "MAX":
                return this.performApplyMax(mappedGroup);
                break;
            case "MIN":
                return this.performApplyMin(mappedGroup);
                break;
            case "AVG":
                return this.performApplyAvg(mappedGroup);
                break;
            case "SUM":
                return this.performApplySum(mappedGroup);
                break;
            default:
                // count
                return group.length;
                break;
        }
    }

    private performApplyMax(group: any[]): any {
        let max: any = group[0];
        for (const elem of group) {
            if (elem > max) {
                max = elem;
            }
        }
        return max;
    }

    private performApplyMin(group: any[]): any {
        let min: any = group[0];
        for (const elem of group) {
            if (elem < min) {
                min = elem;
            }
        }
        return min;
    }

    private performApplySum(group: any[]): any {
        let sum: Decimal = new Decimal(0);
        for (const elem of group) {
            sum = Decimal.add(sum, new Decimal(elem));
        }
        return Number(sum.toFixed(2));
    }

    private performApplyAvg(group: any[]): any {
        let sum: Decimal = new Decimal(0);
        for (const elem of group) {
            sum = Decimal.add(sum, new Decimal(elem));
        }
        let avg = sum.toNumber() / (group.length);
        return Number(avg.toFixed(2));
    }

    // use this.groupArr to get the values specified in this.queryTransf.GROUP, add them to the right obj in finalRes
    private performGroupKeys() {
        for (const i in this.finalRes) {
            let uuid: string = this.groupArr[i][0];
            let ret: any = this.finalRes[i];
            for (const wholeKey of this.groupKeys) {
                let key = wholeKey.split("_")[1];
                ret[wholeKey] = JSON.parse(this.map.get(Number(uuid)))[key];
            }
            this.finalRes[i] = ret;
        }
        return;
    }

    ////////////////////////////////////// Methods from QueryObjectPerformer //////////////////////////////////
    private performOrderSortString() { // only runs when there are no TRANSFORMATIONS
        let key = this.queryOptions.ORDER;
        let field = key.split("_")[1];
        // TODO: account for rooms fields in the line below
        if (this.fieldChecker.includesMField(field) || field === "id" || field === "uuid") {
            this.finalRes.sort((obj1: any, obj2: any) => {
                return obj1[key] - obj2[key];
            });
        } else {
            this.finalRes.sort((obj1: any, obj2: any) => {
                return obj1[key] > obj2[key] ? 1 : -1;
            });
        }
    }

    private performOrderSortObj() {
        let dir: string = this.queryOptions.ORDER["dir"];
        let keys: string[] = this.queryOptions.ORDER["keys"];
        this.finalRes.sort((obj1: any, obj2: any) => {
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
}
