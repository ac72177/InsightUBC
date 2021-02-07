import {InsightError, ResultTooLargeError} from "./IInsightFacade";

const LOGIC: string[] = ["AND", "OR"];
const MCOMPARATOR: string[] = ["GT", "EQ", "LT"];
const Mfield: string[] = ["avg", "pass", "fail", "audit", "year"];
const SCOMPARATOR: string[] = ["IS"];
const Sfield: string[] = ["dept", "id", "instructor", "title", "uuid"];
const NEG: string[] = ["NOT"];

// jsonConstructor check from https://stackoverflow.com/questions/11182924/how-to-check-if-javascript-object-is-json
const jsonConstructor = ({}).constructor;

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

// WHERE contains only one FILTER object
function syntaxCheckFilters(query: any) {
    if (!(query.constructor === jsonConstructor)) { throw new InsightError(); }
    if (Object.keys(query).length > 1) {throw new InsightError(); }

    if (Object.keys(query).length === 1) {

        const key = Object.keys(query)[0];
        if (LOGIC.includes(key)) {
            syntaxCheckLogic(query[key]);
        } else if (MCOMPARATOR.includes(key)) {
            syntaxCheckMComparator(query[key]);
        } else if (SCOMPARATOR.includes(key)) {
            syntaxCheckSComparator(query[key]);
        } else if (NEG.includes(key)) {
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
function syntaxCheckLogic(queryArr: any) { // query must be an array
    if (!Array.isArray(queryArr) || queryArr.length <= 0) { throw new InsightError(); }
    for (const i in queryArr) {
        if (queryArr[i].constructor !== jsonConstructor) {throw new InsightError(); }
        syntaxCheckFilters(queryArr[i]);
    }
    return;
}

//  id must be one or more of any character, except underscore.
// !!! TODO: Ask TA what about all spaces?
function syntaxCheckValidId(id: string) {
    if (id.includes("_") || id.length < 1) { throw new InsightError(); }
    return;
}

function syntaxCheckValidInputString(str: string) {
    let parsed = str.split("*");
    if (parsed.length > 1 || parsed[0].length < 1) { throw new InsightError(); }
    return;
}

// MCOMPARATOR value must be one JSON obj
//      obj key must be Mkey and value must be number
// Mkey and Skey check that idstring is valid.
function syntaxCheckMComparator(query: any) { // must be one json obj
    if (!(query.constructor === jsonConstructor)) { throw new InsightError(); }
    for (let mkey in query) {
        let parsed = mkey.split("_");
        if (parsed.length !== 2) { throw new InsightError(); }
        syntaxCheckValidId(parsed[0]);
        if (!Mfield.includes(parsed[1])) { throw new InsightError(); }
        if (typeof(query[mkey]) !== "number") { throw new InsightError(); }
    }
    return;
}

// SCOMPARATOR value must be one JSON obj
//      obj key must be Skey, value must be (valid)inputString. Check *
// Mkey and Skey check that idstring is valid.
function syntaxCheckSComparator(query: any) {
    if (!(query.constructor === jsonConstructor)) { throw new InsightError(); }
    for (let skey in query) {
        let parsed = skey.split("_");
        if (parsed.length !== 2) { throw new InsightError(); }
        syntaxCheckValidId(parsed[0]);
        if (!Sfield.includes(parsed[1])) { throw new InsightError(); }
        if (typeof query[skey] !== "string") { throw new InsightError(); }
        syntaxCheckValidInputString(query[skey]);
    }
    return;
}

// NEGATION value must be one JSON obj containing a FILTER
function syntaxCheckNegation(query: any) { // query must be an object
    if (!(query.constructor === jsonConstructor)) { throw new InsightError(); }
    syntaxCheckFilters(query);
    return;
}

// COLUMNS must be array of strings
function syntaxCheckCols(queryArr: any) { // must be array
    if (!Array.isArray(queryArr)) { throw new InsightError(); }
    for (const str of queryArr) {
        if (typeof str !== "string") {throw new InsightError(); }
    }
    return;
}

// if ORDER, value must be a string
function syntaxCheckOrder(query: any) {
    if (typeof query !== "string") { throw new InsightError(); }
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
