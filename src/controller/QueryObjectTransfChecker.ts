// handles all syntax checks related to query.TRANSFORMATIONS
// checks that everything in columns is in transformations and vice versa
import {InsightError, NotFoundError} from "./IInsightFacade";
import {CoursesFields, QueryFields, RoomsFields} from "./QueryFields";
const jsonConstructor = ({}).constructor;
const APPLYTOKEN: string[] = ["MAX", "MIN", "AVG", "COUNT", "SUM"];
const Mfield: string[] = ["avg", "pass", "fail", "audit", "year", "lat", "lon", "seats"];
const Sfield: string[] = ["dept", "id", "instructor", "title", "uuid",
    "fullname", "shortname", "number", "name", "address", "type", "furniture", "href"];

export class QueryObjectTransfChecker {
    private applykeys: string[] = [];
    private colsArr: string[];
    private groupKeys: string[];
    private fieldChecker: QueryFields;
    private query: any; // the TRANSFORMATION section of query

    private currentID: string; // purely for the checkValidID method
    private currentCourses: string[];
    private currentRooms: string[];

    constructor(queryTransf: any, colsArr: string[], currentID: string, fieldChecker: QueryFields,
                currentCourses: string[], currentRooms: string[]) {
        this.colsArr = colsArr;
        this.query = queryTransf;
        this.currentID = currentID;
        this.fieldChecker = fieldChecker;
        this.currentCourses = currentCourses;
        this.currentRooms = currentRooms;
    }

    public syntaxCheckTRANSFORMATIONS() {
        if (this.query.constructor !== jsonConstructor) {
            throw new InsightError();
        }
        if (!(this.query.hasOwnProperty("GROUP") && this.query.hasOwnProperty("APPLY"))) {
            throw new InsightError();
        }
        this.syntaxCheckAPPLY(this.query["APPLY"]);
        this.syntaxCheckGROUP(this.query["GROUP"]);
        this.semanticCheckTransfCols();
        return;
    }

    private syntaxCheckGROUP(queryArr: any) {
        if (!Array.isArray(queryArr) || queryArr.length <= 0) {
            throw new InsightError();
        }
        for (const str of queryArr) {
            if (typeof str !== "string") {
                throw new InsightError();
            }
            let parsed = str.split("_");
            if (parsed.length !== 2) { // GROUP cannot contain applykeys
                throw new InsightError();
            }
            // all columns terms must be in transformations, but NOT vice versa
            this.syntaxCheckValidId(parsed[0]);
            if (!Mfield.includes(parsed[1]) && !Sfield.includes(parsed[1])) {
                throw new InsightError();
            }
        }
        this.groupKeys = queryArr;
        return;
    }

    private syntaxCheckAPPLY(queryArr: any) {
        if (!Array.isArray(queryArr) || queryArr.length < 0) { // Apply arr can be empty
            throw new InsightError();
        }
        for (const i in queryArr) {
            if (queryArr[i].constructor !== jsonConstructor) {
                throw new InsightError();
            }
            let applykey: string = Object.keys(queryArr[i])[0];
            if (Object.keys(queryArr[i]).length !== 1 || applykey.includes("_") || this.applykeys.includes(applykey)) {
                throw new InsightError();
            }
            this.syntaxCheckApplyElem(queryArr[i][applykey]);
            this.applykeys.push(applykey);
        }
        return;
    }

    private syntaxCheckApplyElem(query: any) {
        if (query.constructor !== jsonConstructor) {
            throw new InsightError();
        }
        if (Object.keys(query).length !== 1) {
            throw new InsightError();
        }
        let key: string = Object.keys(query)[0]; // POTENTIAL LINE SHORTENING HERE IF NEEDED
        if (!APPLYTOKEN.includes(key)) {
            throw new InsightError();
        }

        let val: string = query[key];
        let parsed = val.split("_");
        if (parsed.length !== 2) {
            throw new InsightError();
        }
        this.syntaxCheckValidId(parsed[0]);
        if (!Sfield.includes(parsed[1]) && !Mfield.includes(parsed[1])) {
            throw new InsightError();
        }
        if (key !== "COUNT" && (!this.fieldChecker.includesMField(parsed[1]))) {
            throw new InsightError();
        }
    }

    // make sure all keys mentioned in columns are in GROUP
    // make sure all applyKeys mentioned in columns are in APPLY
    // this function runs last, so applykeys and groupkeys will have already been filled in
    private semanticCheckTransfCols() {
        for (const key of this.colsArr) {
            if (key.includes("_")) { // if it is a normal key
                if (!this.groupKeys.includes(key)) { // this.groupKeys filled in during syntaxCheckGROUP
                    throw new InsightError();
                }
            } else { // it is an apply key
                if (!this.applykeys.includes(key)) { // this.applykeys filled in during syntaxCheckAPPLY
                    throw new InsightError();
                }
            }
        }
        return;
    }

    // function from QueryObject
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
}
