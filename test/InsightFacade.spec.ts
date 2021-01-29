import { expect } from "chai";
import * as chai from "chai";
import * as fs from "fs-extra";
import * as chaiAsPromised from "chai-as-promised";
import {InsightDataset, InsightDatasetKind, InsightError} from "../src/controller/IInsightFacade";
import InsightFacade from "../src/controller/InsightFacade";
import Log from "../src/Util";
import TestUtil from "./TestUtil";

// This extends chai with assertions that natively support Promises
chai.use(chaiAsPromised);

// This should match the schema given to TestUtil.validate(..) in TestUtil.readTestQueries(..)
// except 'filename' which is injected when the file is read.
export interface ITestQuery {
    title: string;
    query: any;  // make any to allow testing structurally invalid queries
    isQueryValid: boolean;
    result: any;
    filename: string;  // This is injected when reading the file
}

describe("InsightFacade Add/Remove/List Dataset", function () {
    // Reference any datasets you've added to test/data here and they will
    // automatically be loaded in the 'before' hook.
    const datasetsToLoad: { [id: string]: string } = {
        courses: "./test/data/courses.zip",
    };
    let datasets: { [id: string]: string } = {};
    let insightFacade: InsightFacade;
    const cacheDir = __dirname + "/../data";

    before(function () {
        // This section runs once and loads all datasets specified in the datasetsToLoad object
        // into the datasets object
        Log.test(`Before all`);
        if (!fs.existsSync(cacheDir)) {
            fs.mkdirSync(cacheDir);
        }
        for (const id of Object.keys(datasetsToLoad)) {
            datasets[id] = fs.readFileSync(datasetsToLoad[id]).toString("base64");
        }
        try {
            insightFacade = new InsightFacade();
        } catch (err) {
            Log.error(err);
        }
    });

    beforeEach(function () {
        Log.test(`BeforeTest: ${this.currentTest.title}`);
    });

    after(function () {
        Log.test(`After: ${this.test.parent.title}`);
    });

    afterEach(function () {
        // This section resets the data directory (removing any cached data) and resets the InsightFacade instance
        // This runs after each test, which should make each test independent from the previous one
        Log.test(`AfterTest: ${this.currentTest.title}`);
        try {
            fs.removeSync(cacheDir);
            fs.mkdirSync(cacheDir);
            insightFacade = new InsightFacade();
        } catch (err) {
            Log.error(err);
        }
    });

    // This is a unit test. You should create more like this!
    it("Should add a valid dataset", function () {
        const id: string = "courses";
        const expected: string[] = [id];
        const futureResult: Promise<string[]> = insightFacade.addDataset(id, datasets[id], InsightDatasetKind.Courses);
        return expect(futureResult).to.eventually.deep.equal(expected);
    });

    it("Should read from disk", function () {
        const id: string = "courses";
        const expected: string[] = [id];
        let futureResult: Promise<string[]> = insightFacade.addDataset(
            id,
            datasets[id],
            InsightDatasetKind.Courses,
        );
        return expect(futureResult).to.eventually.deep.equal(expected).then(() => {
            let diskFacade: InsightFacade;
            diskFacade = new InsightFacade();
            let expectedList: InsightDataset[] = [];
            let listResult: Promise<InsightDataset[]> = diskFacade.listDatasets();
            return expect(listResult).to.eventually.deep.equal(expectedList).then(() => {
                // dataset should be removed from disk
                let expectedRemove: string = "Remove Success";
                let removeResult: Promise<string> = diskFacade.removeDataset(id);
                return expect(removeResult).to.eventually.deep.equal(expectedRemove).then(() => {
                    // should add to memory already on disk
                    futureResult = insightFacade.addDataset(
                        id,
                        datasets[id],
                        InsightDatasetKind.Courses,
                    );
                    return expect(futureResult).to.eventually.deep.equal(expected);
                });
            });
        });
    });

    it("Should add a valid dataset already in disk", function () {
        let id: string = "courses";
        let expected: string[] = [id];
        let futureResult: Promise<string[]> = insightFacade.addDataset(
            id,
            datasets[id],
            InsightDatasetKind.Courses,
        );
        return expect(futureResult).to.eventually.deep.equal(expected).then(() => {
            let diskFacade: InsightFacade;
            diskFacade = new InsightFacade();
            futureResult = diskFacade.addDataset(
                id,
                datasets[id],
                InsightDatasetKind.Courses,
            );
            return expect(futureResult).to.eventually.deep.equal(expected);
        });
    });

    it("Should not add invalid zip structure data", function () {
        const id: string = "invalidStructure";
        const expected: string[] = [id];
        const futureResult: Promise<string[]> = insightFacade.addDataset(
            id,
            datasets[id],
            InsightDatasetKind.Courses,
        );
        return expect(futureResult).to.be.rejectedWith(InsightError);
    });

    it("Should not add no valid course section", function () {
        const id: string = "noValidSections";
        const expected: string[] = [id];
        const futureResult: Promise<string[]> = insightFacade.addDataset(
            id,
            datasets[id],
            InsightDatasetKind.Courses,
        );
        return expect(futureResult).to.be.rejectedWith(InsightError);
    });

    it("Should not add invalid json course", function () {
        const id: string = "invalidJSON";
        const expected: string[] = [id];
        const futureResult: Promise<string[]> = insightFacade.addDataset(
            id,
            datasets[id],
            InsightDatasetKind.Courses,
        );
        return expect(futureResult).to.be.rejectedWith(InsightError);
    });

    it("Should not add NULL parameters", function () {
        let id: string = "some string";
        let expected: string[] = [id];
        let futureResult: Promise<string[]> = insightFacade.addDataset(
            null,
            datasets[id],
            InsightDatasetKind.Courses,
        );
        return expect(futureResult).to.be.rejectedWith(InsightError).then(() => {
            futureResult = insightFacade.addDataset(
                id,
                null,
                InsightDatasetKind.Courses
            );
            return expect(futureResult).to.be.rejectedWith(InsightError).then(() => {
                futureResult = insightFacade.addDataset(
                    id,
                    datasets[id],
                    null
                );
                return expect(futureResult).to.be.rejectedWith(InsightError);
            });
        });
    });

    it("Should not add rooms yet", function () {
        const id: string = "invalidJSON";
        const expected: string[] = [id];
        const futureResult: Promise<string[]> = insightFacade.addDataset(
            id,
            datasets[id],
            InsightDatasetKind.Rooms,
        );
        return expect(futureResult).to.be.rejectedWith(InsightError);
    });

    it("Should not add invalid ID only whitespace", function () {
        const id: string = "         ";
        const expected: string[] = [id];
        const futureResult: Promise<string[]> = insightFacade.addDataset(
            id,
            datasets[id],
            InsightDatasetKind.Rooms,
        );
        return expect(futureResult).to.be.rejectedWith(InsightError);
    });

    it("Should not add invalid ID has underscore", function () {
        const id: string = "no_valid_sections";
        const expected: string[] = [id];
        const futureResult: Promise<string[]> = insightFacade.addDataset(
            id,
            datasets[id],
            InsightDatasetKind.Rooms,
        );
        return expect(futureResult).to.be.rejectedWith(InsightError);
    });

    it("Should add valid dataset containing invalid files", function () {
        // JSON file contains 2 courses, invalid names
        const id: string = "shouldAddWithInvalid";
        const expected: string[] = [id];
        const futureResult: Promise<string[]> = insightFacade.addDataset(
            id,
            datasets[id],
            InsightDatasetKind.Rooms,
        );
        return expect(futureResult).to.eventually.deep.equal(expected);
    });

    it("Should add valid dataset containing invalid files 2", function () {
        // JSON file contains 2 courses, invalid names
        const id: string = "shouldAddWithInvalid2";
        const expected: string[] = [id];
        const futureResult: Promise<string[]> = insightFacade.addDataset(
            id,
            datasets[id],
            InsightDatasetKind.Rooms,
        );
        return expect(futureResult).to.eventually.deep.equal(expected);
    });

    it("Should not remove already removed/dne dataset", function () {
        const id: string = "courses";
        const expected: string = "Remove Success";
        const futureResult: Promise<string> = insightFacade.removeDataset(id);
        return expect(futureResult).to.be.rejectedWith(InsightError);
    });
    it("Should not remove invalid id whitespace", function () {
        const id: string = "        ";
        const expected: string = "Remove Success";
        const futureResult: Promise<string> = insightFacade.removeDataset(id);
        return expect(futureResult).to.be.rejectedWith(InsightError);
    });

    it("Should not remove null id whitespace", function () {
        const id: string = null;
        const expected: string = "Remove Success";
        const futureResult: Promise<string> = insightFacade.removeDataset(id);
        return expect(futureResult).to.be.rejectedWith(InsightError);
    });

    it("Should not remove invalid id underscore", function () {
        const id: string = "this_test_should_fail";
        const expected: string = "Remove Success";
        const futureResult: Promise<string> = insightFacade.removeDataset(id);
        return expect(futureResult).to.be.rejectedWith(InsightError);
    });

    it("Should list existing datasets, none added", function () {
        const id: string = "courses";
        const expected: InsightDataset[] = [];
        const futureResult: Promise<InsightDataset[]> = insightFacade.listDatasets();
        return expect(futureResult).to.eventually.deep.equal(expected);
    });

    it("Should not add existing dataset chain", function () {
        let id: string = "courses";
        let expected: string[] = [id];
        let futureResult: Promise<string[]> = insightFacade.addDataset(
            id,
            datasets[id],
            InsightDatasetKind.Courses,
        );
        return expect(futureResult).to.eventually.deep.equal(expected).then(() => {
            futureResult = insightFacade.addDataset(
                id,
                datasets[id],
                InsightDatasetKind.Courses,
            );
            return expect(futureResult).to.be.rejectedWith(InsightError).then(() => {
                // after error, can still add a valid dataset
                id = "shouldAddWithInvalid";
                expected = [id];
                futureResult = insightFacade.addDataset(
                    id,
                    datasets[id],
                    InsightDatasetKind.Courses,
                );
                return expect(futureResult).to.eventually.deep.equal(expected);
            });
        });
    });

    it("Should remove existing dataset with the specified id", function () {
        let id: string = "courses";
        let expected: string[] = [id];
        let futureResult: Promise<string[]> = insightFacade.addDataset(
            id,
            datasets[id],
            InsightDatasetKind.Courses,
        );
        return expect(futureResult).to.eventually.deep.equal(expected).then(() => {
            let removeExpected: string = "Remove Success";
            let removeResult: Promise<string> = insightFacade.removeDataset(id);
            return expect(removeResult).to.eventually.deep.equal(removeExpected).then(() => {
                // cannot remove the same dataset twice
                removeResult = insightFacade.removeDataset(id);
                return expect(removeResult).to.be.rejectedWith(InsightError);
            });
        });
    });

    it("Should remove existing dataset after wrong name", function () {
        let id: string = "courses";
        let expected: string[] = [id];
        let futureResult: Promise<string[]> = insightFacade.addDataset(
            id,
            datasets[id],
            InsightDatasetKind.Courses,
        );
        return expect(futureResult).to.eventually.deep.equal(expected).then(() => {
            let removeExpected: string = "Remove Success";
            let removeResult: Promise<string> = insightFacade.removeDataset("   ");
            return expect(removeResult).to.be.rejectedWith(InsightError).then(() => {
                // cannot remove the same dataset twice
                removeResult = insightFacade.removeDataset(id);
                return expect(removeResult).to.eventually.deep.equal(removeExpected);
            });
        });
    });

    it("Should list added datasets chain", function () {
        let id: string = "courses";
        let expected: string[] = [id];
        let futureResult: Promise<string[]> = insightFacade.addDataset(
            id,
            datasets[id],
            InsightDatasetKind.Courses,
        );
        return expect(futureResult).to.eventually.deep.equal(expected).then(() => {
            let listExpected: InsightDataset[] = [];
            let listResult: Promise<InsightDataset[]> = insightFacade.listDatasets();
            return expect(listResult).to.eventually.deep.equal(listExpected).then(() => {
                id = "shouldAddWithInvalid";
                expected = [id];
                futureResult = insightFacade.addDataset(
                    id,
                    datasets[id],
                    InsightDatasetKind.Courses,
                );
                return expect(futureResult).to.eventually.deep.equal(expected).then(() => {
                    // update listExpected here
                    listResult = insightFacade.listDatasets();
                    return expect(listResult).to.eventually.deep.equal(listExpected);
                });
            });
        });
    });

    it("add same dataset twice (fail second time), remove dataset, add successful", function () {
        let id: string = "courses";
        let expected: string[] = [id];
        let futureResult: Promise<string[]> = insightFacade.addDataset(
            id,
            datasets[id],
            InsightDatasetKind.Courses,
        );
        return expect(futureResult).to.eventually.deep.equal(expected).then(() => {
            // fail to add same dataset again
            futureResult = insightFacade.addDataset(
                id,
                datasets[id],
                InsightDatasetKind.Courses,
            );
            return expect(futureResult).to.be.rejectedWith(InsightError).then(() => {
                let removeExpected: string = "Remove Success";
                let removeResult: Promise<string> = insightFacade.removeDataset(id);
                return expect(removeResult).to.eventually.deep.equal(removeExpected).then(() => {
                    // can add it again after its removal
                    futureResult = insightFacade.addDataset(
                        id,
                        datasets[id],
                        InsightDatasetKind.Courses,
                    );
                    return expect(futureResult).to.eventually.deep.equal(expected).then(() => {
                        // can remove again after added
                        removeResult = insightFacade.removeDataset(id);
                        return expect(removeResult).to.eventually.deep.equal(removeExpected);
                    });
                });
            });
        });
    });

    it("remove fail, add success, remove success", function () {
        let id: string = "courses";
        let removeExpected: string = "Remove Success";
        let removeResult: Promise<string> = insightFacade.removeDataset(id);
        return expect(removeResult).to.be.rejectedWith(InsightError).then(() => {
            let expected: string[] = [id];
            let futureResult: Promise<string[]> = insightFacade.addDataset(
                id,
                datasets[id],
                InsightDatasetKind.Courses,
            );
            return expect(futureResult).to.eventually.deep.equal(expected).then(() => {
                // can remove now
                removeResult = insightFacade.removeDataset(id);
                return expect(removeResult).to.eventually.deep.equal(removeExpected);
            });
        });
    });
});

/*
 * This test suite dynamically generates tests from the JSON files in test/queries.
 * You should not need to modify it; instead, add additional files to the queries directory.
 * You can still make tests the normal way, this is just a convenient tool for a majority of queries.
 */
describe("InsightFacade PerformQuery", () => {
    const datasetsToQuery: { [id: string]: {path: string, kind: InsightDatasetKind} } = {
        courses: {path: "./test/data/courses.zip", kind: InsightDatasetKind.Courses},
    };
    let insightFacade: InsightFacade;
    let testQueries: ITestQuery[] = [];

    // Load all the test queries, and call addDataset on the insightFacade instance for all the datasets
    before(function () {
        Log.test(`Before: ${this.test.parent.title}`);

        // Load the query JSON files under test/queries.
        // Fail if there is a problem reading ANY query.
        try {
            testQueries = TestUtil.readTestQueries();
        } catch (err) {
            expect.fail("", "", `Failed to read one or more test queries. ${err}`);
        }

        // Load the datasets specified in datasetsToQuery and add them to InsightFacade.
        // Will fail* if there is a problem reading ANY dataset.
        const loadDatasetPromises: Array<Promise<string[]>> = [];
        insightFacade = new InsightFacade();
        for (const id of Object.keys(datasetsToQuery)) {
            const ds = datasetsToQuery[id];
            const data = fs.readFileSync(ds.path).toString("base64");
            loadDatasetPromises.push(insightFacade.addDataset(id, data, ds.kind));
        }
        return Promise.all(loadDatasetPromises).catch((err) => {
            /* *IMPORTANT NOTE: This catch is to let this run even without the implemented addDataset,
             * for the purposes of seeing all your tests run.
             * TODO For C1, remove this catch block (but keep the Promise.all)
             */
            return Promise.resolve("HACK TO LET QUERIES RUN");
        });
    });

    beforeEach(function () {
        Log.test(`BeforeTest: ${this.currentTest.title}`);
    });

    after(function () {
        Log.test(`After: ${this.test.parent.title}`);
    });

    afterEach(function () {
        Log.test(`AfterTest: ${this.currentTest.title}`);
    });

    // Dynamically create and run a test for each query in testQueries
    // Creates an extra "test" called "Should run test queries" as a byproduct. Don't worry about it
    it("Should run test queries", function () {
        describe("Dynamic InsightFacade PerformQuery tests", function () {
            for (const test of testQueries) {
                it(`[${test.filename}] ${test.title}`, function () {
                    const futureResult: Promise<any[]> = insightFacade.performQuery(test.query);
                    return TestUtil.verifyQueryResult(futureResult, test);
                });
            }
        });
    });

    it("Should not query null query", function () {
        const futureResult: Promise<any[]> = insightFacade.performQuery(null);
        return expect(futureResult).to.be.rejectedWith(InsightError);
    });
});
