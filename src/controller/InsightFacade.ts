import Log from "../Util";
import {IInsightFacade, InsightDataset, InsightDatasetKind, ResultTooLargeError} from "./IInsightFacade";
import {InsightError, NotFoundError} from "./IInsightFacade";
import {syntaxCheck, semanticsCheck, QueryObject} from "./QueryObject";

/**
 * This is the main programmatic entry point for the project.
 * Method documentation is in IInsightFacade
 *
 */
export default class InsightFacade implements IInsightFacade {

    constructor() {
        Log.trace("InsightFacadeImpl::init()");
    }

    public addDataset(id: string, content: string, kind: InsightDatasetKind): Promise<string[]> {
        return Promise.reject("Not implemented.");
    }

    public removeDataset(id: string): Promise<string> {
        return Promise.reject("Not implemented.");
    }


    public performQuery(query: any): Promise<any[]> {
        // I think query can only be either a JSON or a string
        let localQuery: string = query;
        let jsonQuery: JSON;

        try {
            jsonQuery = JSON.parse(localQuery);
            syntaxCheck(jsonQuery);
            semanticsCheck(jsonQuery);
        } catch (e) {
            // if (e === SyntaxError) { return Promise.reject("Invalid JSON Syntax"); }
            return Promise.reject(e); // can be either syntax error or Insight Error
        }


        let queryObject: QueryObject = new QueryObject(jsonQuery);

        let res: JSON[];
        try {
            res = queryObject.getQueryResults();
        } catch (e) {
            return Promise.reject(e); // ResultTooLargeError thrown from queryObject
        }

        return Promise.resolve(res);
    }

    public listDatasets(): Promise<InsightDataset[]> {
        return Promise.reject("Not implemented.");
    }
}
