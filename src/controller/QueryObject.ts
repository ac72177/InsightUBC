import {InsightError, NotFoundError, ResultTooLargeError} from "./IInsightFacade";
import {QueryObjectPerformer} from "./QueryObjectPerformer";
import {QueryObjectTransfChecker} from "./QueryObjectTransfChecker";
import {QueryFields, CoursesFields, RoomsFields} from "./QueryFields";
const LOGIC: string[] = ["AND", "OR"];
const MCOMPARATOR: string[] = ["GT", "EQ", "LT"];
const SCOMPARATOR: string[] = ["IS"];
const NEG: string[] = ["NOT"];
const DIRECTION: string[] = ["UP", "DOWN"];

// jsonConstructor check from https://stackoverflow.com/questions/11182924/how-to-check-if-javascript-object-is-json
const jsonConstructor = ({}).constructor;

// TODO: change current iterations of this.coursesMap to roomsMap where necessary
export class QueryObject {
    private readonly query: any;
    private currentID: string;
    private readonly currentCourses: string[];
    private readonly coursesMap: any;
    private fieldChecker: QueryFields;
    private readonly currentRooms: string[] = [];
    private readonly roomsMap: any; // TODO: modify constructor to instantiate these 2 variables

    constructor(query: any, coursesDatasets: string[], coursesMap: any, roomsDatasets: string[], roomsMap: any) {
        this.currentID = "";
        this.currentCourses = coursesDatasets;
        this.query = query;
        this.coursesMap = coursesMap;
        this.currentRooms = roomsDatasets;
        this.roomsMap = roomsMap;
        return;
    }

    // TODO: comment out this method once finished testing
    public testGetResLength(): number {
        let map = this.currentCourses.includes(this.currentID) ?
            this.coursesMap.get(this.currentID) : this.roomsMap.get(this.currentID);
        let queryPerformer: QueryObjectPerformer = new QueryObjectPerformer(this.query, map, this.fieldChecker);
        return queryPerformer.testGetResLength();
    }

    public getQueryResults(): object[] {
        let map = this.currentCourses.includes(this.currentID) ?
            this.coursesMap.get(this.currentID) : this.roomsMap.get(this.currentID);
        // this.coursesMap = this.coursesMap.get(this.currentID); // this.coursesMap is now the courses coursesMap
        let queryPerformer: QueryObjectPerformer = new QueryObjectPerformer(this.query, map, this.fieldChecker);
        return queryPerformer.getQueryResults();
    }

    // query contains WHERE and OPTIONS, optionally contains TRANSFORMATIONS
    public syntaxCheck() {
        if (this.query.constructor !== jsonConstructor) {
            throw new InsightError();
        }
        if (!(this.query.hasOwnProperty("WHERE") && this.query.hasOwnProperty("OPTIONS"))) {
            throw new InsightError();
        }
        if (Object.keys(this.query).length > 3) { // max 3 items, min is 2
            throw new InsightError();
        }
        this.syntaxCheckFilter(this.query.WHERE);
        this.syntaxCheckOPTIONS(this.query.OPTIONS);
        if (Object.keys(this.query).length === 3) {
            if (!(this.query.hasOwnProperty("TRANSFORMATIONS"))) {
                throw new InsightError();
            }
            let transfChecker =
                new QueryObjectTransfChecker(this.query["TRANSFORMATIONS"], this.query.OPTIONS.COLUMNS, this.currentID,
                    this.fieldChecker, this.currentCourses, this.currentRooms);
            transfChecker.syntaxCheckTRANSFORMATIONS();
        }
        return;
    }

// WHERE contains only one FILTER object
    private syntaxCheckFilter(query: any) {
        if (!(query.constructor === jsonConstructor)) {
            throw new InsightError();
        }
        if (Object.keys(query).length > 1) {
            throw new InsightError();
        }

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
        if (!query.hasOwnProperty("COLUMNS") || Object.keys(query).length > 2) {
            throw new InsightError();
        }
        this.syntaxCheckCols(query["COLUMNS"]);

        if (Object.keys(query).length === 2) {
            if (!query.hasOwnProperty("ORDER")) {
                throw new InsightError();
            }
            this.syntaxCheckOrder(query["ORDER"]);
        }
        return;
    }

// LOGIC comparisons value must be array containing only FILTER JSON objs
    private syntaxCheckLogic(queryArr: any) { // query must be an array
        if (!Array.isArray(queryArr) || queryArr.length <= 0) {
            throw new InsightError();
        }
        for (const i in queryArr) {
            if (queryArr[i].constructor !== jsonConstructor) {
                throw new InsightError();
            }
            if (Object.keys(queryArr[i]).length === 0) {
                throw new InsightError();
            }
            this.syntaxCheckFilter(queryArr[i]);
        }
        return;
    }

//  id must be one or more of any character, except underscore.
    private syntaxCheckValidId(id: string) {
        if (id.includes("_") || id.length < 1) {
            throw new InsightError();
        }
        if (id.split(" ").length > 1) {
            throw new InsightError();
        }
        if (this.currentID === "") {
            // ID is being read for the first time. Determine if rooms or courses here.
            if (this.currentCourses.includes(id)) {
                this.currentID = id;
                this.fieldChecker = new CoursesFields();
            } else if (this.currentRooms.includes(id)) {
                this.currentID = id;
                this.fieldChecker = new RoomsFields();
            } else {
                throw new NotFoundError();
            }
        } else if (id !== this.currentID) { // make sure same dataset
            throw new InsightError();
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
                if (parsed[0].length !== 0 && parsed[1].length !== 0) {
                    throw new InsightError();
                }
                break;

            case 3:
                if (parsed[0].length !== 0 || parsed[2].length !== 0) {
                    throw new InsightError();
                }
                break;

            default:
                throw new InsightError();
        }
        return;
    }

    private syntaxCheckMComparator(query: any) { // must be one json obj
        if (!(query.constructor === jsonConstructor)) {
            throw new InsightError();
        }
        if (Object.keys(query).length !== 1) {
            throw new InsightError();
        }
        let mkey = Object.keys(query)[0];
        let parsed = mkey.split("_");
        if (parsed.length !== 2) {
            throw new InsightError();
        }
        this.syntaxCheckValidId(parsed[0]);
        if (!this.fieldChecker.includesMField(parsed[1])) {
            throw new InsightError();
        }
        if (typeof(query[mkey]) !== "number") {
            throw new InsightError();
        }
        return;
    }

    private syntaxCheckSComparator(query: any) {
        if (!(query.constructor === jsonConstructor)) {
            throw new InsightError();
        }
        if (Object.keys(query).length !== 1) {
            throw new InsightError();
        }
        let skey = Object.keys(query)[0];
        let parsed = skey.split("_");
        if (parsed.length !== 2) {
            throw new InsightError();
        }
        this.syntaxCheckValidId(parsed[0]);
        if (!this.fieldChecker.includesSField(parsed[1])) {
            throw new InsightError();
        }
        if (typeof query[skey] !== "string") {
            throw new InsightError();
        }
        this.syntaxCheckValidInputString(query[skey]);
        return;
    }

    private syntaxCheckNegation(query: any) { // query must be an object
        if (!(query.constructor === jsonConstructor)) {
            throw new InsightError();
        }
        this.syntaxCheckFilter(query);
        return;
    }

    private syntaxCheckCols(queryArr: any) {
        if (!Array.isArray(queryArr) || queryArr.length <= 0) {
            throw new InsightError();
        }
        for (const str of queryArr) {
            if (typeof str !== "string") {
                throw new InsightError();
            }
            let parsed = str.split("_");
            switch (parsed.length) {
                case 1: // it is an APPLYKEY. will check its validity in TRANSFORMATIONS
                    if (!this.query.hasOwnProperty("TRANSFORMATIONS")) {// must have TRANSFORMATIONS to have applykey
                        throw new InsightError();
                    }
                    break;
                case 2:
                    this.syntaxCheckValidId(parsed[0]);
                    if (!this.fieldChecker.includesMField(parsed[1]) && !this.fieldChecker.includesSField(parsed[1])) {
                        throw new InsightError();
                    }
                    break;
                default:
                    throw new InsightError();
            }
        }
        return;
    }

    private syntaxCheckOrder(query: any) {
        if (typeof query !== "string" && query.constructor !== jsonConstructor) {
            throw new InsightError();
        }
        // if ORDER is just a string, it must be in columns
        if (typeof query === "string") {
            if (!this.query.OPTIONS["COLUMNS"].includes(query)) {
                throw new InsightError();
            }
        } else { // else order is a json
            let queryKeys = Object.keys(query);
            if (!(queryKeys.length === 2 && queryKeys.includes("dir") && queryKeys.includes("keys"))) {
                throw new InsightError();
            }
            if (typeof query["dir"] !== "string" || !DIRECTION.includes(query["dir"]) ||
                !Array.isArray(query["keys"])) {
                throw new InsightError();
            }
            for (const val of query["keys"]) {
                if (typeof val !== "string" || !this.query.OPTIONS.COLUMNS.includes(val)) {
                    throw new InsightError();
                }
            }
        }
        return;
    }
}
