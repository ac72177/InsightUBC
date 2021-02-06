import {InsightError, ResultTooLargeError} from "./IInsightFacade";

const LOGIC: string[] = [];
const MCOMPARATOR: string[] = ["GT"];
const Mfield: string[] = [];
const SCOMPARATOR: string[] = [];
const Sfield: string[] = [];


// !!! TODO: Implement method to check syntax and grammar of query
// query contains WHERE and OPTIONS
export function syntaxCheck(query: any) {
    // throw new InsightError();
    if (!(query.hasOwnProperty("WHERE") && query.hasOwnProperty("OPTIONS"))) { throw new InsightError(); }
    try {
        syntaxCheckFilters(query.WHERE);
        syntaxCheckOPTIONS(query.OPTIONS);
    } catch (e) {
        throw new InsightError();
    }
    return;
}

// WHERE contains only FILTERS
function syntaxCheckFilters(query: any) {
    for (const key in query) {

        if (LOGIC.includes(key)) {
            syntaxCheckLogic(query[key]);
        } else if (MCOMPARATOR.includes(key)) {
            syntaxCheckMComparator(query[key]);
        } else if (SCOMPARATOR.includes(query[key])) {
            syntaxCheckSComparator(query[key]);
        } else if (key === "NOT") {
            syntaxCheckNegation(query[key]);
        } else { // key is not a filter. throw error
            throw new InsightError();
        }
    }
    return;
}

// OPTIONS contains COLUMNS
function syntaxCheckOPTIONS(query: any) {
    if (!query.hasOwnProperty("COLUMNS")) {throw new InsightError(); }

    for (const key in query) {
        if (key === "COLUMNS") {
            syntaxCheckCols(query[key]);
        } else if (key === "ORDER") {
            syntaxCheckOrder(query[key]);
        } else { throw new InsightError(); }
    }
    return;
}

// LOGIC comparisons value must be array containing only FILTER JSON objs
function syntaxCheckLogic(query: any) { // query must be an array
    return;
}

// MCOMPARATOR value must be one JSON obj
//      obj key must be Mkey and value must be number
// Mkey and Skey check that idstring is valid.
function syntaxCheckMComparator(query: any) { // must be one json obj
    return;
}

// SCOMPARATOR value must be one JSON obj
//      obj key must be Skey, value must be (valid)inputString. Check *
// Mkey and Skey check that idstring is valid.
function syntaxCheckSComparator(query: any) {
    return;
}

// NEGATION value must be one JSON obj containing a FILTER
function syntaxCheckNegation(query: any) { // query must be an object
    return;
}

// COLUMNS must be array of strings
function syntaxCheckCols(query: any) { // must be array
    return;
}

// if ORDER, value must be a string
function syntaxCheckOrder(query: any) {
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
        let res: JSON[] = [];
        if (res.length > this.MAX_RES_SIZE) {
            throw new ResultTooLargeError();
        }
        return;
    }
}
