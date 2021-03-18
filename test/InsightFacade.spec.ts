import { expect } from "chai";
import * as chai from "chai";
import * as fs from "fs-extra";
import * as chaiAsPromised from "chai-as-promised";
import {InsightDataset, InsightDatasetKind, InsightError, NotFoundError} from "../src/controller/IInsightFacade";
import InsightFacade from "../src/controller/InsightFacade";
import Log from "../src/Util";
import TestUtil from "./TestUtil";
import {RoomsDataset} from "../src/controller/RoomsDataset";

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

// describe("InsightFacade Add/Remove/List Dataset", function () {
//     // Reference any datasets you've added to test/data here and they will
//     // automatically be loaded in the 'before' hook.
//     const datasetsToLoad: { [id: string]: string } = {
//         courses: "./test/data/courses.zip",
//         rooms: "./test/data/rooms.zip",
//         courses0: "./test/data/courses.zip",
//         empty: "./test/data/empty.zip",
//         noValidJSON: "./test/data/noValidJSON.zip",
//         oneValidCourse: "./test/data/oneValidCourse.zip",
//         hello: "./test/data/hello.txt",
//         invalidStructure: "./test/data/invalidStructure.zip",
//         noValidSections: "./test/data/noValidSections.zip",
//         invalidJSON: "./test/data/invalidJSON.zip",
//         shouldAddWithInvalid: "./test/data/shouldAddWithInvalid.zip",
//         shouldAddWithInvalid2: "./test/data/shouldAddWithInvalid2.zip",
//         noCoursesDirectory: "./test/data/noCoursesDirectory.zip",
//         noRoomsDirectory: "./test/data/noRoomsDirectory.zip",
//     };
//     let datasets: { [id: string]: string } = {};
//     let insightFacade: InsightFacade;
//     const cacheDir = __dirname + "/../data";
//
//     before(function () {
//         // This section runs once and loads all datasets specified in the datasetsToLoad object
//         // into the datasets object
//         Log.test(`Before all`);
//         if (!fs.existsSync(cacheDir)) {
//             fs.mkdirSync(cacheDir);
//         }
//         for (const id of Object.keys(datasetsToLoad)) {
//             datasets[id] = fs.readFileSync(datasetsToLoad[id]).toString("base64");
//         }
//         try {
//             insightFacade = new InsightFacade();
//         } catch (err) {
//             Log.error(err);
//         }
//     });
//
//     beforeEach(function () {
//         Log.test(`BeforeTest: ${this.currentTest.title}`);
//     });
//
//     after(function () {
//         Log.test(`After: ${this.test.parent.title}`);
//     });
//
//     afterEach(function () {
//         // This section resets the data directory (removing any cached data) and resets the InsightFacade instance
//         // This runs after each test, which should make each test independent from the previous one
//         Log.test(`AfterTest: ${this.currentTest.title}`);
//         try {
//             fs.removeSync(cacheDir);
//             fs.mkdirSync(cacheDir);
//             insightFacade = new InsightFacade();
//         } catch (err) {
//             Log.error(err);
//         }
//     });
//
//     // This is a unit test. You should create more like this!
//     it("Should add a valid  courses", function () {
//         const id: string = "courses";
//         const expected: string[] = [id];
//         const futureResult: Promise<string[]> = insightFacade.addDataset(
//         id,
//         datasets[id],
//         InsightDatasetKind.Courses);
//         return expect(futureResult).to.eventually.deep.equal(expected);
//     });
//
//     it("add rooms, list, add courses, list, remove rooms, list", function () {
//         const id: string = "rooms";
//         const expected: string[] = [id];
//         const myDataset1: InsightDataset = {
//             id: "rooms",
//             kind: InsightDatasetKind.Rooms,
//             numRows: 364,
//         };
//         const myDataset2: InsightDataset = {
//             id: "courses",
//             kind: InsightDatasetKind.Courses,
//             numRows: 64612,
//         };
//         const futureResult: Promise<string[]> = insightFacade.addDataset(
//             id,
//             datasets[id],
//             InsightDatasetKind.Rooms);
//         return expect(futureResult).to.eventually.deep.equal(expected).then(() => {
//             let expectedList: InsightDataset[] = [myDataset1];
//             let listResult: Promise<InsightDataset[]> = insightFacade.listDatasets();
//             return expect(listResult).to.eventually.deep.equal(expectedList).then(() => {
//                 const id1: string = "courses";
//                 const expected1: string[] = [id, id1];
//                 const futureResult1: Promise<string[]> = insightFacade.addDataset(
//                     id1,
//                     datasets[id1],
//                     InsightDatasetKind.Courses);
//                 return expect(futureResult1).to.eventually.deep.equal(expected1).then(() => {
//                     let expectedList1: InsightDataset[] = [myDataset1, myDataset2];
//                     let listResult1: Promise<InsightDataset[]> = insightFacade.listDatasets();
//                     return expect(listResult1).to.eventually.deep.equal(expectedList1).then(() => {
//                         let expectedRemove: string = id;
//                         let removeResult: Promise<string> = insightFacade.removeDataset(id);
//                         return expect(removeResult).to.eventually.deep.equal(expectedRemove);
//                     });
//                 });
//              });
//          });
//     });
//
//     it("Should add rooms", function () {
//         const id: string = "rooms";
//         const expected: string[] = [id];
//         const futureResult: Promise<string[]> = insightFacade.addDataset(
//             id,
//             datasets[id],
//             InsightDatasetKind.Rooms);
//         return expect(futureResult).to.eventually.deep.equal(expected);
//     });
//
//     it("GeoLocation Test", function () {
//         let roomsDataset = new RoomsDataset(insightFacade);
//         const futureResult: Promise<any> = roomsDataset.getGeolocation(
//             "http://cs310.students.cs.ubc.ca:11316/api/v1/project_team062/", "6245 Agronomy Road V6T 1Z4");
//         const expected = {lat: 49.26125, lon: -123.24807};
//         return expect(futureResult).to.eventually.deep.equal(expected);
//     });
//
//     it("Should not add no courses directory", function () {
//         const id: string = "noCoursesDirectory";
//         const futureResult: Promise<string[]> = insightFacade.addDataset(id,
//         datasets[id], InsightDatasetKind.Courses);
//         return expect(futureResult).to.be.rejectedWith(InsightError);
//     });
//
//     it("Should not add no Room directory", function () {
//         const id: string = "noRoomsDirectory";
//         const futureResult: Promise<string[]> = insightFacade.addDataset(id,
//             datasets[id], InsightDatasetKind.Rooms);
//         return expect(futureResult).to.be.rejectedWith(InsightError);
//     });
//
//     it("Should read from disk", function () {
//         const id: string = "courses";
//         const expected: string[] = [id];
//         let futureResult: Promise<string[]> = insightFacade.addDataset(id, datasets[id], InsightDatasetKind.Courses);
//         return expect(futureResult).to.eventually.deep.equal(expected).then(() => {
//             let diskFacade: InsightFacade;
//             diskFacade = new InsightFacade();
//             const myDataset1: InsightDataset = {
//                 id: "courses",
//                 kind: InsightDatasetKind.Courses,
//                 numRows: 64612,
//             };
//             let expectedList: InsightDataset[] = [myDataset1];
//             let listResult: Promise<InsightDataset[]> = diskFacade.listDatasets();
//             return expect(listResult).to.eventually.deep.equal(expectedList).then(() => {
//                 // dataset should be removed from disk
//                 let expectedRemove: string = id;
//                 let removeResult: Promise<string> = diskFacade.removeDataset(id);
//                 return expect(removeResult).to.eventually.deep.equal(expectedRemove).then(() => {
//                     // should not add to memory already on disk
//                     futureResult = insightFacade.addDataset(
//                         id,
//                         datasets[id],
//                         InsightDatasetKind.Courses,
//                     );
//                     return expect(futureResult).to.be.rejectedWith(InsightError);
//                 });
//             });
//         });
//     });
//
//     it("Should not add a valid dataset already in disk", function () {
//         let id: string = "courses";
//         let expected: string[] = [id];
//         let futureResult: Promise<string[]> = insightFacade.addDataset(
//             id,
//             datasets[id],
//             InsightDatasetKind.Courses,
//         );
//         return expect(futureResult).to.eventually.deep.equal(expected).then(() => {
//             let diskFacade: InsightFacade;
//             diskFacade = new InsightFacade();
//             futureResult = diskFacade.addDataset(
//                 id,
//                 datasets[id],
//                 InsightDatasetKind.Courses,
//             );
//             return expect(futureResult).to.be.rejectedWith(InsightError);
//         });
//     });
//
//     it("Should not add invalid zip structure data", function () {
//         const id: string = "invalidStructure";
//         const futureResult: Promise<string[]> = insightFacade.addDataset(
//             id,
//             datasets[id],
//             InsightDatasetKind.Courses,
//         );
//         return expect(futureResult).to.be.rejectedWith(InsightError);
//     });
//
//     it("Should not add no valid course section", function () {
//         const id: string = "noValidSections";
//         const futureResult: Promise<string[]> = insightFacade.addDataset(
//             id,
//             datasets[id],
//             InsightDatasetKind.Courses,
//         );
//         return expect(futureResult).to.be.rejectedWith(InsightError);
//     });
//
//     it("Should not add invalid json course", function () {
//         const id: string = "invalidJSON";
//         const futureResult: Promise<string[]> = insightFacade.addDataset(
//             id,
//             datasets[id],
//             InsightDatasetKind.Courses,
//         );
//         return expect(futureResult).to.be.rejectedWith(InsightError);
//     });
//
//     it("Should not add mismatching kind and zip", function () {
//         const id: string = "courses";
//         const futureResult: Promise<string[]> = insightFacade.addDataset(
//             id,
//             datasets[id],
//             InsightDatasetKind.Rooms,
//         );
//         return expect(futureResult).to.be.rejectedWith(InsightError);
//     });
//
//     it("Should not add NULL parameters", function () {
//         let id: string = "some string";
//         let futureResult: Promise<string[]> = insightFacade.addDataset(
//             null,
//             datasets[id],
//             InsightDatasetKind.Courses,
//         );
//         return expect(futureResult).to.be.rejectedWith(InsightError).then(() => {
//             futureResult = insightFacade.addDataset(
//                 id,
//                 null,
//                 InsightDatasetKind.Courses
//             );
//             return expect(futureResult).to.be.rejectedWith(InsightError).then(() => {
//                 futureResult = insightFacade.addDataset(
//                     id,
//                     datasets[id],
//                     null
//                 );
//                 return expect(futureResult).to.be.rejectedWith(InsightError);
//             });
//         });
//     });
//
//     it("Should not add invalid ID only whitespace", function () {
//         const id: string = "         ";
//         const futureResult: Promise<string[]> = insightFacade.addDataset(
//             id,
//             datasets[id],
//             InsightDatasetKind.Rooms,
//         );
//         return expect(futureResult).to.be.rejectedWith(InsightError);
//     });
//
//     it("Should not add invalid ID has underscore", function () {
//         const id: string = "no_valid_sections";
//         const futureResult: Promise<string[]> = insightFacade.addDataset(
//             id,
//             datasets[id],
//             InsightDatasetKind.Rooms,
//         );
//         return expect(futureResult).to.be.rejectedWith(InsightError);
//     });
//
//     it("Should add valid dataset containing invalid files", function () {
//         // JSON file contains 2 courses, invalid names
//         const id: string = "shouldAddWithInvalid";
//         const expected: string[] = [id];
//         const futureResult: Promise<string[]> = insightFacade.addDataset(
//             id,
//             datasets[id],
//             InsightDatasetKind.Courses,
//         );
//         return expect(futureResult).to.eventually.deep.equal(expected);
//     });
//
//     it("Should add valid dataset containing invalid files 2", function () {
//         // JSON file contains 2 courses, invalid names
//         const id: string = "shouldAddWithInvalid2";
//         const expected: string[] = [id];
//         const futureResult: Promise<string[]> = insightFacade.addDataset(
//             id,
//             datasets[id],
//             InsightDatasetKind.Courses,
//         );
//         return expect(futureResult).to.eventually.deep.equal(expected);
//     });
//
//     it("Should not remove already removed/dne dataset", function () {
//         const id: string = "courses";
//         const futureResult: Promise<string> = insightFacade.removeDataset(id);
//         return expect(futureResult).to.be.rejectedWith(NotFoundError);
//     });
//     it("Should not remove invalid id whitespace", function () {
//         const id: string = "        ";
//         const futureResult: Promise<string> = insightFacade.removeDataset(id);
//         return expect(futureResult).to.be.rejectedWith(InsightError);
//     });
//
//     it("Should not remove null id whitespace", function () {
//         const id: string = null;
//         const futureResult: Promise<string> = insightFacade.removeDataset(id);
//         return expect(futureResult).to.be.rejectedWith(InsightError);
//     });
//
//     it("Should not remove invalid id underscore", function () {
//         const id: string = "this_test_should_fail";
//         const futureResult: Promise<string> = insightFacade.removeDataset(id);
//         return expect(futureResult).to.be.rejectedWith(InsightError);
//     });
//
//     it("Should list existing datasets, none added", function () {
//         const expected: InsightDataset[] = [];
//         const futureResult: Promise<InsightDataset[]> = insightFacade.listDatasets();
//         return expect(futureResult).to.eventually.deep.equal(expected);
//     });
//
//     it("Should not add existing dataset chain short", function () {
//         let id: string = "courses";
//         let expected: string[] = [id];
//         let futureResult: Promise<string[]> = insightFacade.addDataset(
//             id,
//             datasets[id],
//             InsightDatasetKind.Courses,
//         );
//         return expect(futureResult).to.eventually.deep.equal(expected).then(() => {
//             futureResult = insightFacade.addDataset(
//                 id,
//                 datasets[id],
//                 InsightDatasetKind.Courses,
//             );
//             return expect(futureResult).to.be.rejectedWith(InsightError);
//         });
//     });
//
//     it("Should remove existing dataset with the specified id", function () {
//         let id: string = "courses";
//         let expected: string[] = [id];
//         let futureResult: Promise<string[]> = insightFacade.addDataset(
//             id,
//             datasets[id],
//             InsightDatasetKind.Courses,
//         );
//         return expect(futureResult).to.eventually.deep.equal(expected).then(() => {
//             let removeExpected: string = id;
//             let removeResult: Promise<string> = insightFacade.removeDataset(id);
//             return expect(removeResult).to.eventually.deep.equal(removeExpected).then(() => {
//                 // cannot remove the same dataset twice
//                 removeResult = insightFacade.removeDataset(id);
//                 return expect(removeResult).to.be.rejectedWith(NotFoundError);
//             });
//         });
//     });
//
//     it("Should remove existing dataset after wrong name", function () {
//         let id: string = "courses";
//         let expected: string[] = [id];
//         let futureResult: Promise<string[]> = insightFacade.addDataset(
//             id,
//             datasets[id],
//             InsightDatasetKind.Courses,
//         );
//         return expect(futureResult).to.eventually.deep.equal(expected).then(() => {
//             let removeExpected: string = id;
//             let removeResult: Promise<string> = insightFacade.removeDataset("   ");
//             return expect(removeResult).to.be.rejectedWith(InsightError).then(() => {
//                 // cannot remove the same dataset twice
//                 removeResult = insightFacade.removeDataset(id);
//                 return expect(removeResult).to.eventually.deep.equal(removeExpected);
//             });
//         });
//     });
//
//     it("Should list added datasets chain", function () {
//         let id: string = "courses";
//         let expected: string[] = [id];
//         let futureResult: Promise<string[]> = insightFacade.addDataset(
//             id,
//             datasets[id],
//             InsightDatasetKind.Courses,
//         );
//         let listExpected: InsightDataset[] = [];
//         return expect(futureResult).to.eventually.deep.equal(expected).then(() => {
//             const myDataset1: InsightDataset = {
//                 id: "courses",
//                 kind: InsightDatasetKind.Courses,
//                 numRows: 64612,
//             };
//             listExpected.push(myDataset1);
//             let listResult: Promise<InsightDataset[]> = insightFacade.listDatasets();
//             return expect(listResult).to.eventually.deep.equal(listExpected).then(() => {
//                 let id1 = "shouldAddWithInvalid";
//                 expected = [id, id1];
//                 futureResult = insightFacade.addDataset(
//                     id1,
//                     datasets[id1],
//                     InsightDatasetKind.Courses,
//                 );
//                 return expect(futureResult).to.eventually.deep.equal(expected).then(() => {
//                     const myDataset2: InsightDataset = {
//                         id: "shouldAddWithInvalid",
//                         kind: InsightDatasetKind.Courses,
//                         numRows: 202,
//                     };
//                     listExpected.push(myDataset2);
//                     listResult = insightFacade.listDatasets();
//                     return expect(listResult).to.eventually.deep.equal(listExpected);
//                 });
//             });
//         });
//     });
//
//     it("Add, Remove, Add, Remove", function () {
//         let id: string = "courses";
//         let expected: string[] = [id];
//         let futureResult: Promise<string[]> = insightFacade.addDataset(
//             id,
//             datasets[id],
//             InsightDatasetKind.Courses,
//         );
//         return expect(futureResult).to.eventually.deep.equal(expected).then(() => {
//             let removeExpected: string = id;
//             let removeResult: Promise<string> = insightFacade.removeDataset(id);
//             return expect(removeResult).to.eventually.deep.equal(removeExpected).then(() => {
//                 // can add it again after its removal
//                 futureResult = insightFacade.addDataset(
//                     id,
//                     datasets[id],
//                     InsightDatasetKind.Courses,
//                 );
//                 return expect(futureResult).to.eventually.deep.equal(expected).then(() => {
//                     // can remove again after added
//                     removeResult = insightFacade.removeDataset(id);
//                     return expect(removeResult).to.eventually.deep.equal(removeExpected);
//                 });
//             });
//         });
//     });
//     // This is a unit test. You should create more like this!
//     // ADDS dataset then LISTS the dataset then rejects ADDING repeated id
//     it( "Should add a valid dataset, list data set, reject a repeated id", function () {
//         const id: string = "courses";
//         const expectedAdd: string[] = [id];
//         let futureResult: Promise<string[]> = insightFacade.addDataset(id, datasets[id], InsightDatasetKind.Courses);
//         // accepts courses as id and ADDS to dataset
//         return expect(futureResult).to.eventually.deep.equal(expectedAdd).then(() => {
//             const myDataset: InsightDataset = {
//                 id: "courses",
//                 kind: InsightDatasetKind.Courses,
//                 numRows: 64612,
//             };
//             const expectedList = [myDataset];
//             const futureResultList: Promise<InsightDataset[]> = insightFacade.listDatasets();
//             // LISTS dataset
//             return expect(futureResultList).to.be.eventually.deep.equal(expectedList).then(() => {
//                 futureResult = insightFacade.addDataset(id, datasets[id], InsightDatasetKind.Courses);
//                 // rejects when we try to ADD courses again
//                 return expect(futureResult).to.be.rejectedWith(InsightError);
//             });
//         });
//     });
//     // ADDS dataset then REMOVES the dataset then LISTS an empty array of datasets, fails to REMOVE
//     it("Should add a valid dataset, remove data set, list empty array, try to remove", function () {
//         const id: string = "courses";
//         const expectedAdd: string[] = [id];
//         let futureResult: Promise<string[]> = insightFacade.addDataset(id, datasets[id], InsightDatasetKind.Courses);
//         // accepts courses as id and ADDS to dataset
//         return expect(futureResult).to.eventually.deep.equal(expectedAdd).then(() => {
//             const expectedRemove: string = id;
//             let futureResultRemove: Promise<string> = insightFacade.removeDataset(id);
//             // successfully REMOVES dataset
//             return expect(futureResultRemove).to.eventually.deep.equal(expectedRemove).then(() => {
//                 const expectedList: InsightDataset[] = [];
//                 const futureResultList: Promise<InsightDataset[]> = insightFacade.listDatasets();
//                 return expect(futureResultList).to.eventually.deep.equal(expectedList).then(() => {
//                     futureResultRemove = insightFacade.removeDataset(id);
//                     // fail to remove an already removed dataset
//                     return expect(futureResultRemove).to.be.rejectedWith(NotFoundError);
//                 });
//             });
//         });
//     });
//     // ADDS dataset with only one valid course
//     it("Should add a valid dataset with only one valid course", function () {
//         const id: string = "oneValidCourse";
//         const expected: string[] = [id];
//         const futureResult: Promise<string[]> = insightFacade.addDataset(id,
//         datasets[id], InsightDatasetKind.Courses);
//         return expect(futureResult).to.eventually.deep.equal(expected);
//     });
//
//     it("Should not add existing dataset chain", function () {
//         let id: string = "courses";
//         let expected: string[] = [id];
//         let futureResult: Promise<string[]> = insightFacade.addDataset(
//             id,
//             datasets[id],
//             InsightDatasetKind.Courses,
//         );
//         return expect(futureResult).to.eventually.deep.equal(expected).then(() => {
//             futureResult = insightFacade.addDataset(
//                 id,
//                 datasets[id],
//                 InsightDatasetKind.Courses,
//             );
//             return expect(futureResult).to.be.rejectedWith(InsightError).then(() => {
//                 // after error, can still add a valid dataset
//                 let id1: string = "shouldAddWithInvalid";
//                 expected = [id, id1];
//                 futureResult = insightFacade.addDataset(
//                     id1,
//                     datasets[id1],
//                     InsightDatasetKind.Courses,
//                 );
//                 return expect(futureResult).to.eventually.deep.equal(expected);
//             });
//         });
//     });
//     it("add same dataset twice (fail second time), remove dataset, add successful", function () {
//         let id: string = "courses";
//         let expected: string[] = [id];
//         let futureResult: Promise<string[]> = insightFacade.addDataset(
//             id,
//             datasets[id],
//             InsightDatasetKind.Courses,
//         );
//         return expect(futureResult).to.eventually.deep.equal(expected).then(() => {
//             // fail to add same dataset again
//             futureResult = insightFacade.addDataset(
//                 id,
//                 datasets[id],
//                 InsightDatasetKind.Courses,
//             );
//             return expect(futureResult).to.be.rejectedWith(InsightError).then(() => {
//                 let removeExpected: string = id;
//                 let removeResult: Promise<string> = insightFacade.removeDataset(id);
//                 return expect(removeResult).to.eventually.deep.equal(removeExpected).then(() => {
//                     // can add it again after its removal
//                     futureResult = insightFacade.addDataset(
//                         id,
//                         datasets[id],
//                         InsightDatasetKind.Courses,
//                     );
//                     return expect(futureResult).to.eventually.deep.equal(expected).then(() => {
//                         // can remove again after added
//                         removeResult = insightFacade.removeDataset(id);
//                         return expect(removeResult).to.eventually.deep.equal(removeExpected);
//                     });
//                 });
//             });
//         });
//     });
//     it("remove fail, add success, remove success", function () {
//         let id: string = "courses";
//         let removeExpected: string = id;
//         let removeResult: Promise<string> = insightFacade.removeDataset(id);
//         return expect(removeResult).to.be.rejectedWith(NotFoundError).then(() => {
//             let expected: string[] = [id];
//             let futureResult: Promise<string[]> = insightFacade.addDataset(
//                 id,
//                 datasets[id],
//                 InsightDatasetKind.Courses,
//             );
//             return expect(futureResult).to.eventually.deep.equal(expected).then(() => {
//                 // can remove now
//                 removeResult = insightFacade.removeDataset(id);
//                 return expect(removeResult).to.eventually.deep.equal(removeExpected);
//             });
//         });
//     });
//
//
//     it("should not add null", function () {
//         let id: string = "some string";
//         let futureResult: Promise<string[]> = insightFacade.addDataset(
//             null,
//             datasets[id],
//             InsightDatasetKind.Courses,
//         );
//         return expect(futureResult).to.be.rejectedWith(InsightError).then(() => {
//             futureResult = insightFacade.addDataset(
//                 id,
//                 null,
//                 InsightDatasetKind.Courses
//             );
//             return expect(futureResult).to.be.rejectedWith(InsightError).then(() => {
//                 futureResult = insightFacade.addDataset(
//                     id,
//                     datasets[id],
//                     null
//                 );
//                 return expect(futureResult).to.be.rejectedWith(InsightError);
//             });
//         });
//     });
//     // ADDS 2 data sets and lists it
//     it("Should add 2 datasets and list them", function () {
//         const id1: string = "courses";
//         let expected: string[] = [id1];
//         let futureResult: Promise<string[]> = insightFacade.addDataset(id1,
//         datasets[id1], InsightDatasetKind.Courses);
//         return expect(futureResult).to.eventually.deep.equal(expected).then( () => {
//             const id2: string = "courses0";
//             expected = [id1, id2];
//             futureResult = insightFacade.addDataset(id2, datasets[id2], InsightDatasetKind.Courses);
//             return expect(futureResult).to.eventually.deep.equal(expected).then( () => {
//                 const myDataset1: InsightDataset = {
//                     id: "courses",
//                     kind: InsightDatasetKind.Courses,
//                     numRows: 64612,
//                 };
//                 const myDataset2: InsightDataset = {
//                     id: "courses0",
//                     kind: InsightDatasetKind.Courses,
//                     numRows: 64612,
//                 };
//                 const expectedList = [myDataset1, myDataset2];
//                 const futureResultList: Promise<InsightDataset[]> = insightFacade.listDatasets();
//                 // LISTS dataset
//                 return expect(futureResultList).to.be.eventually.deep.equal(expectedList);
//             });
//         });
//     });
//     // new Insight Facade and reads from disk and LISTS that an empty array
//     it("Should read dataset from disk", function () {
//         insightFacade = new InsightFacade();
//         const expectedList: InsightDataset[] = [];
//         const futureResultList: Promise<InsightDataset[]> = insightFacade.listDatasets();
//         return expect(futureResultList).to.eventually.deep.equal(expectedList);
//     });
//
//     // rejects ADDING empty dataset with insight error
//     it( "Should not add an empty dataset", function () {
//         const id: string = "empty";
//         let futureResult: Promise<string[]> = insightFacade.addDataset(id, datasets[id], InsightDatasetKind.Courses);
//         return expect(futureResult).to.be.rejectedWith(InsightError);
//     });
//     // rejects ADDING non zip dataset with insight error
//     it( "Should not add a non zipped dataset", function () {
//         const id: string = "hello";
//         let futureResult: Promise<string[]> = insightFacade.addDataset(id, datasets[id], InsightDatasetKind.Courses);
//         return expect(futureResult).to.be.rejectedWith(InsightError);
//     });
//
//     // rejects ADDING invalid JSON dataset with insight error
//     it( "Should not add an invalid JSON dataset", function () {
//         const id: string = "noValidJSON";
//         let futureResult: Promise<string[]> = insightFacade.addDataset(id, datasets[id], InsightDatasetKind.Courses);
//         return expect(futureResult).to.be.rejectedWith(InsightError);
//     });
//     // rejects ADDING dataset because of whitespace id
//     it("Should reject dataset with only whitespace id", function () {
//         const id: string = " \t\n";
//         const futureResult: Promise<string[]> = insightFacade.addDataset(
//             id,
//             datasets[id],
//             InsightDatasetKind.Courses,
//         );
//         return expect(futureResult).to.be.rejectedWith(InsightError);
//     });
//
//     // rejects ADDING dataset with id because of underscore
//     it("Should reject dataset with underscore in id", function () {
//         const id: string = "courses_";
//         const futureResult: Promise<string[]> = insightFacade.addDataset(
//             id,
//             datasets[id],
//             InsightDatasetKind.Courses,
//         );
//         return expect(futureResult).to.be.rejectedWith(InsightError);
//     });
//
//     // rejects ADDING dataset because id not listed
//     it("Should reject dataset with not listed id", function () {
//         const id: string = "leafBlower";
//         const futureResult: Promise<string[]> = insightFacade.addDataset(
//             id,
//             datasets[id],
//             InsightDatasetKind.Courses,
//         );
//         return expect(futureResult).to.be.rejectedWith(InsightError);
//     });
//
//     // fails to REMOVE a not yet added dataset
//     it("Should fail to remove a not yet added dataset", function () {
//         const id: string = "courses";
//         let futureResult: Promise<string> = insightFacade.removeDataset(id);
//         return expect(futureResult).to.be.rejectedWith(NotFoundError);
//     });
//
//     // rejects REMOVING dataset because of whitespace id
//     it("Should reject removing dataset with only whitespace id", function () {
//         const id: string = " \t\n";
//         const futureResult: Promise<string> = insightFacade.removeDataset(id);
//         return expect(futureResult).to.be.rejectedWith(InsightError);
//     });
//
//     // rejects REMOVING dataset with id because of underscore
//     it("Should reject removing dataset with underscore in id", function () {
//         const id: string = "courses_";
//         const futureResult: Promise<string> = insightFacade.removeDataset(id);
//         return expect(futureResult).to.be.rejectedWith(InsightError);
//     });
//
//     // rejects ADDING with null parameters id
//     it( "Should not add with null parameters in id", function () {
//         const id: string = "courses";
//         let futureResult: Promise<string[]> = insightFacade.addDataset(null,
//         datasets[id], InsightDatasetKind.Courses);
//         return expect(futureResult).to.be.rejectedWith(InsightError);
//     });
//     // rejects ADDING with null parameters content
//     it( "Should not add with null parameters in content", function () {
//         const id: string = "courses";
//         let futureResult: Promise<string[]> = insightFacade.addDataset(id, null, InsightDatasetKind.Courses);
//         return expect(futureResult).to.be.rejectedWith(InsightError);
//     });
//     // rejects ADDING with null parameters kind
//     it( "Should not add with null parameters kind", function () {
//         const id: string = "courses";
//         let futureResult: Promise<string[]> = insightFacade.addDataset(id, datasets[id], null);
//         return expect(futureResult).to.be.rejectedWith(InsightError);
//     });
//     // rejects ADDING with null parameters
//     it( "Should not add with null parameters", function () {
//         let futureResult: Promise<string[]> = insightFacade.addDataset(null, null, null);
//         return expect(futureResult).to.be.rejectedWith(InsightError);
//     });
//     // rejects REMOVING with null parameters
//     it( "Should not remove with null parameters", function () {
//         let futureResult: Promise<string> = insightFacade.removeDataset(null);
//         return expect(futureResult).to.be.rejectedWith(InsightError);
//     });
//     // rejects ADDING with undefined parameters
//     it( "Should not add with undefined parameters", function () {
//         let futureResult: Promise<string[]>;
//         futureResult = insightFacade.addDataset(undefined, undefined, undefined);
//         return expect(futureResult).to.be.rejectedWith(InsightError);
//     });
//     // rejects ADDING with undefined parameters id
//     it( "Should not add with undefined parameters in id", function () {
//         const id: string = "courses";
//         let futureResult: Promise<string[]>;
//         futureResult = insightFacade.addDataset(undefined, datasets[id], InsightDatasetKind.Courses);
//         return expect(futureResult).to.be.rejectedWith(InsightError);
//     });
//     // rejects ADDING with undefined parameters content
//     it( "Should not add with undefined parameters in content", function () {
//         const id: string = "courses";
//         let futureResult: Promise<string[]>;
//         futureResult = insightFacade.addDataset(id, undefined, InsightDatasetKind.Courses);
//         return expect(futureResult).to.be.rejectedWith(InsightError);
//     });
//     // rejects ADDING with undefined parameters kind
//     it( "Should not add with undefined parameters kind", function () {
//         const id: string = "courses";
//         const futureResult: Promise<string[]> = insightFacade.addDataset(id, datasets[id], undefined);
//         return expect(futureResult).to.be.rejectedWith(InsightError);
//     });
//     // rejects REMOVING with undefined parameters
//     it( "Should not remove with undefined parameters", function () {
//         const futureResult: Promise<string> = insightFacade.removeDataset(undefined);
//         return expect(futureResult).to.be.rejectedWith(InsightError);
//     });
// });

/*
 * This test suite dynamically generates tests from the JSON files in test/queries.
 * You should not need to modify it; instead, add additional files to the queries directory.
 * You can still make tests the normal way, this is just a convenient tool for a majority of queries.
 */
describe("InsightFacade PerformQuery", () => {
    const datasetsToQuery: { [id: string]: {path: string, kind: InsightDatasetKind} } = {
        courses: {path: "./test/data/courses.zip", kind: InsightDatasetKind.Courses},
        totallyNotCourses: {path: "./test/data/courses.zip", kind: InsightDatasetKind.Courses},
        rooms: {path: "./test/data/rooms.zip", kind: InsightDatasetKind.Rooms},
        totallyNotRooms: {path: "./test/data/rooms.zip", kind: InsightDatasetKind.Rooms},
    };
    let insightFacade: InsightFacade;
    let testQueries: ITestQuery[] = [];

    // Load all the test queries, and call addDataset on the insightFacade instance for all the datasets
    before(function () {
        Log.test(`Before: ${this.test.parent.title}`);
        this.timeout(200000000);
        // Load the query JSON files under test/queries.
        // Fail if there is a problem reading ANY query.
        // const cacheDir = __dirname + "/../data";
        // try {
        //     fs.removeSync(cacheDir);
        //     fs.mkdirSync(cacheDir);
        //     insightFacade = new InsightFacade();
        // } catch (err) {
        //     Log.error(err);
        // }
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
        return Promise.all(loadDatasetPromises);
    });

    beforeEach(function () {
        Log.test(`BeforeTest: ${this.currentTest.title}`);
    });

    after(function () {
        Log.test(`After: ${this.test.parent.title}`);
        // This section resets the data directory (removing any cached data) and resets the InsightFacade instance
        // This runs after each test, which should make each test independent from the previous one
        const cacheDir = __dirname + "/../data";
        try {
            fs.removeSync(cacheDir);
            fs.mkdirSync(cacheDir);
        } catch (err) {
            Log.error(err);
        }
    });

    afterEach(function () {
        Log.test(`AfterTest: ${this.currentTest.title}`);
    });

    // Dynamically create and run a test for each query in testQueries
    // Creates an extra "test" called "Should run test queries" as a byproduct. Don't worry about it
    // it("Should run test queries", function () {
    //     describe("Dynamic InsightFacade PerformQuery tests", function () {
    //         for (const test of testQueries) {
    //             it(`[${test.filename}] ${test.title}`, function () {
    //                 const futureResult: Promise<any[]> = insightFacade.performQuery(test.query);
    //                 return TestUtil.verifyQueryResult(futureResult, test);
    //             });
    //         }
    //     });
    // });

    // it("Should check length of results are the same", function () {
    //     describe("Dynamic InsightFacade PerformQuery tests", function () {
    //         for (const test of testQueries) {
    //             if (test.isQueryValid) {
    //                 it(`[${test.filename}] ${test.title}`, function () {
    //                     const futureResult: Promise<number> = insightFacade.testQueryResLength(test.query);
    //                     // return TestUtil.verifyQueryResult(futureResult, test);
    //                     return expect(futureResult).to.eventually.deep.equal(test.result.length);
    //                 });
    //             }
    //         }
    //     });
    // });

    // Dynamically create and run a test for each query in testQueries
    // Tests that the query syntax and semantic checks are working properly
    it("Should validate query properly", function () {
        describe("Dynamic InsightFacade PerformQuery tests", function () {
            for (const test of testQueries) {
                it(`[${test.filename}] ${test.title}`, function () {
                    const queryValidity: Promise<boolean> = insightFacade.testQueryValidity(test.query);
                    return expect(queryValidity).to.eventually.deep.equal(test.isQueryValid);
                });
            }
        });
    });


    // it("Should query simple query", function () {
    //     let testQuery;
    //     for (const test of testQueries) {
    //         if (test.filename === "test/queries/simple.json") {
    //             testQuery = test;
    //             break;
    //         }
    //     }
    //     const futureResult: Promise<any[]> = insightFacade.performQuery(testQuery.query);
    //     return TestUtil.verifyQueryResult(futureResult, testQuery);
    // });
    //
    // it("Should query complex query", function () {
    //     let testQuery;
    //     for (const test of testQueries) {
    //         if (test.filename === "test/queries/complex.json") {
    //             testQuery = test;
    //             break;
    //         }
    //     }
    //     const futureResult: Promise<any[]> = insightFacade.performQuery(testQuery.query);
    //     return TestUtil.verifyQueryResult(futureResult, testQuery);
    // });
    //
    // it("Should not query null query", function () {
    //     const futureResult: Promise<any[]> = insightFacade.performQuery(null);
    //     return expect(futureResult).to.be.rejectedWith(InsightError);
    // });

    it("Should validate test", function () {
        let testQuery: any;
        for (const test of testQueries) {
            if (test.filename === "test/queries/tMegaQuery.json") {
                testQuery = test;
                break;
            }
        }
        // const queryValidity: Promise<boolean> = insightFacade.testQueryValidity(testQuery.query);
        // return expect(queryValidity).to.eventually.deep.equal(testQuery.isQueryValid);
        let futureResult: Promise<any[]> = insightFacade.performQuery(testQuery.query);
        return TestUtil.verifyQueryResult(futureResult, testQuery);

        // .then(() => {
        //     for (const test of testQueries) {
        //         if (test.filename === "test/queries/ANDMComparator.json") {
        //             testQuery = test;
        //             break;
        //         }
        //     }
        //     futureResult = insightFacade.performQuery(testQuery.query);
        //     return TestUtil.verifyQueryResult(futureResult, testQuery);
        // });

        // const lenRes: Promise<number> = insightFacade.testQueryResLength(testQuery.query);
        // return expect(lenRes).to.eventually.deep.equal(testQuery.result.length);
    });
});
