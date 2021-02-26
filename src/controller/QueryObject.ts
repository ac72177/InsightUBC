import {InsightError, NotFoundError, ResultTooLargeError} from "./IInsightFacade";
import {QueryObjectPerformer} from "./QueryObjectPerformer";

const LOGIC: string[] = ["AND", "OR"];
const MCOMPARATOR: string[] = ["GT", "EQ", "LT"];
const Mfield: string[] = ["avg", "pass", "fail", "audit", "year"];
const SCOMPARATOR: string[] = ["IS"];
const Sfield: string[] = ["dept", "id", "instructor", "title", "uuid"];
const NEG: string[] = ["NOT"];

// jsonConstructor check from https://stackoverflow.com/questions/11182924/how-to-check-if-javascript-object-is-json
const jsonConstructor = ({}).constructor;

// dataset referenced must already be added.
// throws resultsTooLarge exception if result length > 5000
export class QueryObject {
    private readonly query: any;
    private currentID: string;
    private currentDatasets: string[];
    private map: any;


    constructor(query: any, datasets: string[], map: any) {
        this.currentID = "";
        this.currentDatasets = datasets;
        this.query = query;
        this.map = map;
        return;
    }

    // TODO: comment out this method once finished testing
    public testGetResLength(): number {
        this.map = this.map.get(this.currentID); // this.map is now the courses map
        let queryPerformer: QueryObjectPerformer = new QueryObjectPerformer(this.query, this.map);
        return queryPerformer.testGetResLength();
    }

    public getQueryResults(): object[] {
        this.map = this.map.get(this.currentID); // this.map is now the courses map
        let queryPerformer: QueryObjectPerformer = new QueryObjectPerformer(this.query, this.map);
        return queryPerformer.getQueryResults();
    }

    // query contains WHERE and OPTIONS
    public syntaxCheck() {
        if (this.query.constructor !== jsonConstructor) { throw new InsightError(); }
        if (!(this.query.hasOwnProperty("WHERE") && this.query.hasOwnProperty("OPTIONS"))) { throw new InsightError(); }
        if (Object.keys(this.query).length !== 2) { throw new InsightError(); }
        this.syntaxCheckFilter(this.query.WHERE);
        this.syntaxCheckOPTIONS(this.query.OPTIONS);
        return;
    }

// WHERE contains only one FILTER object
    private syntaxCheckFilter(query: any) {
        if (!(query.constructor === jsonConstructor)) { throw new InsightError(); }
        if (Object.keys(query).length > 1) {throw new InsightError(); }

        if (Object.keys(query).length === 1) {

            const key = Object.keys(query)[0];
            if (LOGIC.includes(key)) {
                this.syntaxCheckLogic(query[key]);
            } else if (MCOMPARATOR.includes(key)) {
                this.syntaxCheckMComparator(query[key]);
            } else if (SCOMPARATOR.includes(key)) {
                this.syntaxCheckSComparator(query[key]);
            } else if (NEG.includes(key)) {
                this.syntaxCheckNegation(query[key]);
            } else { // key is not a filter. throw error
                throw new InsightError();
            }
        }
        return;
    }

// OPTIONS contains COLUMNS
    private syntaxCheckOPTIONS(query: any) {
        if (!query.hasOwnProperty("COLUMNS") || Object.keys(query).length > 2) {throw new InsightError(); }
        this.syntaxCheckCols(query["COLUMNS"]);

        if (Object.keys(query).length === 2) {
            if (!query.hasOwnProperty("ORDER")) { throw new InsightError(); }
            this.syntaxCheckOrder(query["ORDER"]);
            if (!query["COLUMNS"].includes(query["ORDER"])) { throw new InsightError(); }
        }
        return;
    }

// LOGIC comparisons value must be array containing only FILTER JSON objs
    private syntaxCheckLogic(queryArr: any) { // query must be an array
        if (!Array.isArray(queryArr) || queryArr.length <= 0) { throw new InsightError(); }
        for (const i in queryArr) {
            if (queryArr[i].constructor !== jsonConstructor) {throw new InsightError(); }
            if (Object.keys(queryArr[i]).length === 0) { throw new InsightError(); }
            this.syntaxCheckFilter(queryArr[i]);
        }
        return;
    }

//  id must be one or more of any character, except underscore.
    private syntaxCheckValidId(id: string) {
        if (id.includes("_") || id.length < 1) { throw new InsightError(); }
        if (id.split(" ").length > 1) { throw new InsightError(); }
        if (!this.currentDatasets.includes(id)) { throw new NotFoundError(); } // !!!TODO: NotFoundError()?
        if (this.currentID !== "" && id !== this.currentID) {
            throw new InsightError();
        } else {
            this.currentID = id;
        }
        return;
    }

    private syntaxCheckValidInputString(str: string) {
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
    private syntaxCheckMComparator(query: any) { // must be one json obj
        if (!(query.constructor === jsonConstructor)) { throw new InsightError(); }
        if (Object.keys(query).length !== 1) {throw new InsightError(); }
        let mkey = Object.keys(query)[0];
        let parsed = mkey.split("_");
        if (parsed.length !== 2) { throw new InsightError(); }
        this.syntaxCheckValidId(parsed[0]);
        if (!Mfield.includes(parsed[1])) { throw new InsightError(); }
        if (typeof(query[mkey]) !== "number") { throw new InsightError(); }
        return;
    }

// SCOMPARATOR value must be one JSON obj
//      obj key must be Skey, value must be (valid)inputString. Check *
// Mkey and Skey check that idstring is valid.
    private syntaxCheckSComparator(query: any) {
        if (!(query.constructor === jsonConstructor)) { throw new InsightError(); }
        if (Object.keys(query).length !== 1) {throw new InsightError(); }
        let skey = Object.keys(query)[0];
        let parsed = skey.split("_");
        if (parsed.length !== 2) { throw new InsightError(); }
        this.syntaxCheckValidId(parsed[0]);
        if (!Sfield.includes(parsed[1])) { throw new InsightError(); }
        if (typeof query[skey] !== "string") { throw new InsightError(); }
        this.syntaxCheckValidInputString(query[skey]);
        return;
    }

// NEGATION value must be one JSON obj containing a FILTER
    private syntaxCheckNegation(query: any) { // query must be an object
        if (!(query.constructor === jsonConstructor)) { throw new InsightError(); }
        this.syntaxCheckFilter(query);
        return;
    }

// COLUMNS must be array of strings
    private syntaxCheckCols(queryArr: any) { // must be array
        if (!Array.isArray(queryArr) || queryArr.length <= 0) { throw new InsightError(); }
        for (const str of queryArr) {
            if (typeof str !== "string") { throw new InsightError(); }
            let parsed = str.split("_");
            if (parsed.length !== 2) { throw new InsightError(); }
            this.syntaxCheckValidId(parsed[0]);
            if (!Mfield.includes(parsed[1]) && !Sfield.includes(parsed[1])) { throw new InsightError(); }
        }
        return;
    }

// if ORDER, value must be a string
    private syntaxCheckOrder(query: any) {
        if (typeof query !== "string") { throw new InsightError(); }
        return;
    }
}
