import {QueryFields} from "./QueryFields";

export class QueryObjectTransfPerformer {
    private queryTransf: any;
    private queryOptions: any;
    private map: any;
    private uuidRes: string[];
    private fieldChecker: QueryFields;
    private finalRes: object[];
    private groupArr: string[][] = [];
    private groupKeys: string[];
    private applyKeys: string[];

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
        this.performApply();
        this.performGroupKeys();
        return this.finalRes;
    }

    // TODO: implement this. check QueryObjTransfChecker for how
    // fills in groupkeys and applykeys
    private getGroupAndApplyKeys() {
        return;
    }

    // TODO: complete this method
    // After finishing, this.groupArr should be a 2D array, each inner array representing a group
    private makeGroups() {
        return;
    }

    // TODO: complete this method
    // for each array in this.groupArr, perform APPLY operations and put the result in finalRes
    private performApply() {
        return;
    }

    // TODO: complete this method
    // use this.groupArr to get the values specified in this.queryTransf.GROUP, add them to the right obj in finalRes
    private performGroupKeys() {
        this.convertToRes();
        return;
    }

    ////////////////////////////////////// Methods from QueryObjectPerformer //////////////////////////////////
    private convertToRes() {
        this.finalRes = this.uuidRes.map((uuid) => {
            let obj = JSON.parse(this.map.get(uuid));
            let ret: any = {};
            for (const key of this.queryOptions.COLUMNS) {
                let field = key.split("_")[1];
                ret[key] = obj[field];
            }
            return ret;
        });

        if (this.queryOptions.hasOwnProperty("ORDER")) {
            if (typeof this.queryOptions.ORDER === "string") {
                this.performOrderSortString();
            } else { // ORDER must be an object
                this.performOrderSortObj();
            }
        }
        return;
    }

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
