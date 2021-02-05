import {ResultTooLargeError} from "./IInsightFacade";

// !!! TODO: Implement this class
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
