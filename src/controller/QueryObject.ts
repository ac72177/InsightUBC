import {ResultTooLargeError} from "./IInsightFacade";

enum FILTERS {}
enum LOGIC {}
enum MCOMPARATOR {}
enum Mfield {}
enum SCOMPARATOR {IS}
enum Sfield {}


// !!! TODO: Implement method to check syntax and grammar of query
// query contains WHERE and OPTIONS
// OPTIONS contains COLUMNS
// WHERE contains only FILTERS
// LOGIC comparisons value must be array containing only FILTER JSON objs
// NEGATION value must be one JSON obj containing a FILTER
// MCOMPARATOR key must be MKEY, value must be one JSON obj
//      obj key must be Mkey and value must be number
// SCOMPARATOR key must be MKEY, value must be one JSON obj
//      obj key must be Skey, value must be (valid)inputString
// COLUMNS must be array with valid keys
// if ORDER, value must be a string
// Mkey and Skey check that idstring is valid. check *
export function syntaxCheck(query: JSON) {
    // throw new InsightError();
    return;
}

// !!! TODO: Implement method to check semantics of query
// The key for ORDER is in the COLUMNS array. Only consider one ORDER key.
// Queries reference only one dataset. That dataset must already be added.
export function semanticsCheck(query: JSON) {
    return;
}

// !!! TODO: Implement this class. Look into AST
export class QueryObject {
    private MAX_RES_SIZE: number = 5000;
    private qWhere: JSON;
    private qOption: JSON;


    constructor(query: JSON) {
        return;
    }
    public getQueryResults(): JSON[] {
        let res: JSON[];
        if (res.length > this.MAX_RES_SIZE) {
            throw new ResultTooLargeError();
        }
        return;
    }
}
