import * as JSZip from "jszip";
import {InsightDatasetKind, InsightError} from "./IInsightFacade";
import InsightFacade from "./InsightFacade";
import * as http from "http";

export class RoomsDataset {
    private parse5 = require("parse5");
    private globalJSZip: JSZip;
    private myInsightFacade: InsightFacade;

    constructor(param: InsightFacade) {
        this.myInsightFacade = param;
    }

    public promiseToAddVerifiedDataset(id: string, content: string, kind: InsightDatasetKind): Promise<string[]> {
        let currentZip = new JSZip();
        // let futurePromise: Promise<string[]> =
        return currentZip.loadAsync(content, {base64: true})
            .then((jsZip) => {
                this.globalJSZip = jsZip;
                let roomsIndex = jsZip.file("rooms/index.htm");
                let futureFile: Promise<string> = roomsIndex.async("string");
                return Promise.resolve(futureFile)
                    .then((currentIndex) => {
                        let parsedData: string = this.parse5.parse(currentIndex);
                        return this.getAndUpdateData(parsedData, id, kind);
                    });
            }).catch((error) => {
                return Promise.reject(new InsightError());
            });
        // return Promise.resolve(futurePromise); // todo check if need this
    }

    private getAndUpdateData(parsedData: string, id: string, kind: InsightDatasetKind): Promise<string[]> {
        return this.getData(parsedData)
            .then((nestedMap) => {
                return this.myInsightFacade.updateDataStructure(id, kind, nestedMap);
            });
    }

    private getData(parsedData: string): Promise<Map<string, string>> {
        let nestedMap: Map<string, string> = new Map<string, string>();
        let buildingArray = this.findArray(parsedData);
        let futurePromises: Array<Promise<any>> = [];
        for (let row of buildingArray) {
            let parsedBuildingData;
            let element = this.findFullNameAndAddressLocation(row);
            let fn: string = this.findInChildNodes(element, "a", "#text");
            let sn: string = this.findInChildFromAttrs(row, "td",
                "views-field views-field-field-building-code");
            let addr: string = this.findInChildFromAttrs(row, "td",
                "views-field views-field-field-building-address");
            let path: string = this.findInAttrs(element, "a", "href");
            path = "rooms" + path.substring(1);
            let lat: number;
            let lon: number;
            let url: string = "http://cs310.students.cs.ubc.ca:11316/api/v1/project_team062/";
            try {
                let futureGeoData = this.getGeolocation(url, addr);
                let futurePromise = futureGeoData.then((res) => {
                    lat = res.lat;
                    lon = res.lon;
                }).then(() => {
                    let futureFile = this.globalJSZip.file(path);
                    let fileData = futureFile.async("string");
                    return Promise.resolve(fileData);
                }).then((myFile) => {
                    parsedBuildingData = this.parse5.parse(myFile);
                    let roomArray = this.findArray(parsedBuildingData);
                    for (let room of roomArray) {
                        let elem = this.findNumberAndHREFLocation(room);
                        let num = this.findNumber(elem);
                        let name = sn + " " + num;
                        nestedMap.set(name,
                            this.createNewJSONRoomStringData(room, elem, fn, sn, num, name, addr, lat, lon));
                    }
                });
                futurePromises.push(futurePromise);
            } catch (e) {
                continue;
            }
        }
        return Promise.all(futurePromises).then(() => {
            return Promise.resolve(nestedMap);
        });
    }

    private createNewJSONRoomStringData(roomData: string, element: any, fn: string, sn: string, num: string,
                                        name: string, addr: string, latitude: number, longitude: number): string {
        return JSON.stringify({
            fullname: fn,
            shortname: sn,
            number: num,
            name: name,
            address: addr,
            lat: latitude,
            lon: longitude,
            seats: parseInt(this.findInChildFromAttrs(roomData, "td",
                "views-field views-field-field-room-capacity"), 10),
            type: this.findInChildFromAttrs(roomData, "td", "views-field views-field-field-room-type"),
            furniture: this.findInChildFromAttrs(roomData, "td",
                "views-field views-field-field-room-furniture"),
            href: this.findInAttrs(element, "a", "href"),
        });
    }

    public getGeolocation(url: string, rawAddr: string): Promise<any> {
        return new Promise<any>((resolve, reject) => {
            let link = url + encodeURIComponent(rawAddr);

            http.get(link, (res) => {
                res.setEncoding("utf8");
                let rawData = "";
                res.on("data", (chunk) => {
                    rawData += chunk;
                });
                res.on("end", () => {
                    try {
                        const parsedData = JSON.parse(rawData);
                        return resolve(parsedData);
                    } catch (e) {
                        return reject(new InsightError());
                    }
                });
            }).on("error", (e) => {
                return reject(new InsightError());
            });
        });
    }

    private findArray(element: any): any[] {
        let array: any[] = [];
        if (element.nodeName === "div" &&
            element.attrs[0].value.startsWith("view view-buildings-and-classrooms view-id-buildings_and_classrooms")) {
            for (let i in element.attrs) {
                try {
                    let table: any = this.findTable(element);
                    for (let child of table.childNodes) {
                        if (child.nodeName === "tr" && child.childNodes) {
                            array.push(child);
                        }
                    }
                    return array;
                } catch (e) {
                    continue;
                }
            }
        }
        if (element.childNodes && element.childNodes.length > 0) {
            for (let child of element.childNodes) {
                let possibleArray;
                try {
                    possibleArray = this.findArray(child);
                } catch (e) {
                    continue;
                }

                if (possibleArray.length > 0) {
                    return possibleArray;
                }
            }
        }
        return array;
    }

    private findTable(element: any): any {
        if (element.nodeName === "tbody" && element.childNodes) {
            return element;
        }
        if (element.childNodes && element.childNodes.length > 0) {
            for (let child of element.childNodes) {
                let possibleTableElement = this.findTable(child);
                if (possibleTableElement !== null) {
                    return possibleTableElement;
                }
            }
        }
        return null;
    }

    private findInAttrs(element: any, nodeName: string, attrName: string): string {
        if (element.nodeName === nodeName && element.attrs[0].name === attrName) {
            return element.attrs[0].value;
        }
        if (element.childNodes && element.childNodes.length > 0) {
            for (let child of element.childNodes) {
                let possible = this.findInAttrs(child, nodeName, attrName);
                if (possible !== "") {
                    return possible;
                }
            }
        }
        return "";
    }

    private findInChildNodes(element: any, nodeName: string, childName: string): string {
        if (element.nodeName === nodeName && element.childNodes[0].nodeName === childName) {
            return element.childNodes[0].value;
        }
        if (element.childNodes && element.childNodes.length > 0) {
            for (let child of element.childNodes) {
                let possible = this.findInChildNodes(child, nodeName, childName);
                if (possible !== "") {
                    return possible.trim();
                }
            }
        }
        return "";
    }

    private findInChildFromAttrs(element: any, nodeName: string, attrsVal: string): string {
        if (element.nodeName === nodeName && element.attrs[0].value === attrsVal) {
            return element.childNodes[0].value;
        }
        if (element.childNodes && element.childNodes.length > 0) {
            for (let child of element.childNodes) {
                let possible = this.findInChildFromAttrs(child, nodeName, attrsVal);
                if (possible !== "") {
                    return possible.trim();
                }
            }
        }
        return "";
    }

    private findFullNameAndAddressLocation(element: any): any {
        if (element.nodeName === "td" && element.attrs[0].value === "views-field views-field-title"
            && element.childNodes) {
            return element;
        }
        if (element.childNodes && element.childNodes.length > 0) {
            for (let child of element.childNodes) {
                let possibleElement = this.findFullNameAndAddressLocation(child);
                if (possibleElement !== null) {
                    return possibleElement;
                }
            }
        }
        return null;
    }

    private findNumberAndHREFLocation(element: any): any {
        if (element.nodeName === "td" && element.attrs[0].value === "views-field views-field-field-room-number") {
            for (let child of element.childNodes) {
                if (child.nodeName === "a") {
                    return child;
                }
            }
        }
        if (element.childNodes && element.childNodes.length > 0) {
            for (let child of element.childNodes) {
                let possibleLocation = this.findNumberAndHREFLocation(child);
                if (possibleLocation !== "") {
                    return possibleLocation;
                }
            }
        }
        return "";
    }

    private findNumber(element: any): string {
        if (element.nodeName === "#text") {
            return element.value.trim();
        }
        if (element.childNodes && element.childNodes.length > 0) {
            for (let child of element.childNodes) {
                let possibleNumber = this.findNumber(child);
                if (possibleNumber !== "") {
                    return possibleNumber;
                }
            }
        }
        return "";
    }
}
