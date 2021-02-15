import {InsightError, ResultTooLargeError} from "./IInsightFacade";

const LOGIC: string[] = ["AND", "OR"];
const MCOMPARATOR: string[] = ["GT", "EQ", "LT"];
const Mfield: string[] = ["avg", "pass", "fail", "audit", "year"];
const SCOMPARATOR: string[] = ["IS"];
const Sfield: string[] = ["dept", "id", "instructor", "title", "uuid"];
const NEG: string[] = ["NOT"];

let currentID: string = "";
let currentDatasets: string[];

// jsonConstructor check from https://stackoverflow.com/questions/11182924/how-to-check-if-javascript-object-is-json
const jsonConstructor = ({}).constructor;

// !!! TODO: Implement method to check syntax and grammar of query
// query contains WHERE and OPTIONS
export function syntaxCheck(query: any, datasets: string[]) {
    currentDatasets = datasets;
    currentID = ""; // initialize current id
    if (query.constructor !== jsonConstructor) { throw new InsightError(); }
    if (!(query.hasOwnProperty("WHERE") && query.hasOwnProperty("OPTIONS"))) { throw new InsightError(); }
    if (Object.keys(query).length !== 2) { throw new InsightError(); }
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
    if (!query.hasOwnProperty("COLUMNS") || Object.keys(query).length > 2) {throw new InsightError(); }
    syntaxCheckCols(query["COLUMNS"]);

    if (Object.keys(query).length === 2) {
        if (!query.hasOwnProperty("ORDER")) { throw new InsightError(); }
        syntaxCheckOrder(query["ORDER"]);
        if (!query["COLUMNS"].includes(query["ORDER"])) { throw new InsightError(); }
    }
    return;
}

// LOGIC comparisons value must be array containing only FILTER JSON objs
function syntaxCheckLogic(queryArr: any) { // query must be an array
    if (!Array.isArray(queryArr) || queryArr.length <= 0) { throw new InsightError(); }
    for (const i in queryArr) {
        if (queryArr[i].constructor !== jsonConstructor) {throw new InsightError(); }
        if (Object.keys(queryArr[i]).length === 0) { throw new InsightError(); }
        syntaxCheckFilters(queryArr[i]);
    }
    return;
}

//  id must be one or more of any character, except underscore.
// !!! TODO: Ask TA what about all spaces?
function syntaxCheckValidId(id: string) {
    if (id.includes("_") || id.length < 1) { throw new InsightError(); }
    if (!currentDatasets.includes(id)) { throw new InsightError(); }
    if (currentID !== "" && id !== currentID) {
        throw new InsightError();
    } else {
        currentID = id;
    }
    return;
}

function syntaxCheckValidInputString(str: string) {
    let parsed = str.split("*");
    // if (parsed.length > 3 || parsed[0].length < 1) { throw new InsightError(); }
    switch (parsed.length) {
        case 1:
            break;
        case 2:
            if (parsed[0].length !== 0 && parsed[1].length !== 0) {throw new InsightError(); }
            break;

        case 3:
            if (parsed[0].length !== 0 || parsed[2].length !== 0) {throw new InsightError(); }
            break;

        default:
            throw new InsightError();
    }
    return;
}

// MCOMPARATOR value must be one JSON obj
//      obj key must be Mkey and value must be number
// Mkey and Skey check that idstring is valid.
function syntaxCheckMComparator(query: any) { // must be one json obj
    if (!(query.constructor === jsonConstructor)) { throw new InsightError(); }
    if (Object.keys(query).length !== 1) {throw new InsightError(); }
    let mkey = Object.keys(query)[0];
    let parsed = mkey.split("_");
    if (parsed.length !== 2) { throw new InsightError(); }
    syntaxCheckValidId(parsed[0]);
    if (!Mfield.includes(parsed[1])) { throw new InsightError(); }
    if (typeof(query[mkey]) !== "number") { throw new InsightError(); }
    return;
}

// SCOMPARATOR value must be one JSON obj
//      obj key must be Skey, value must be (valid)inputString. Check *
// Mkey and Skey check that idstring is valid.
function syntaxCheckSComparator(query: any) {
    if (!(query.constructor === jsonConstructor)) { throw new InsightError(); }
    if (Object.keys(query).length !== 1) {throw new InsightError(); }
    let skey = Object.keys(query)[0];
    let parsed = skey.split("_");
    if (parsed.length !== 2) { throw new InsightError(); }
    syntaxCheckValidId(parsed[0]);
    if (!Sfield.includes(parsed[1])) { throw new InsightError(); }
    if (typeof query[skey] !== "string") { throw new InsightError(); }
    syntaxCheckValidInputString(query[skey]);
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
        if (typeof str !== "string") { throw new InsightError(); }
        let parsed = str.split("_");
        if (parsed.length !== 2) { throw new InsightError(); }
        syntaxCheckValidId(parsed[0]);
        if (!Mfield.includes(parsed[1]) && !Sfield.includes(parsed[1])) { throw new InsightError(); }
    }
    return;
}

// if ORDER, value must be a string
function syntaxCheckOrder(query: any) {
    if (typeof query !== "string") { throw new InsightError(); }
    return;
}

// !!! TODO: Implement this class. Look into AST
// dataset referenced must already be added.
// throws resultsTooLarge exception if result length > 5000
export class QueryObject {
    private MAX_RES_SIZE: number = 5000;
    private qWhere: JSON;
    private qOption: JSON;
    private id: string;


    constructor(query: any) {
        this.id = "";
        return;
    }
    public getQueryResults(): JSON[] {
        let res: JSON[] = [];
        if (res.length > this.MAX_RES_SIZE) {
            throw new ResultTooLargeError();
        }
        return res;
    }
}
