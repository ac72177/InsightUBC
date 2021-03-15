import * as JSZip from "jszip";
import {InsightError} from "./IInsightFacade";
import InsightFacade from "./InsightFacade";

export class RoomsDataset {
    private globalJSZip: JSZip;
    private myInsightFacade: InsightFacade;
    constructor(param: InsightFacade) {
        this.myInsightFacade = param;
    }

    public promiseToAddVerifiedDataset(id: string, content: string): Promise<string[]> {
        let currentZip = new JSZip();
        return new Promise<string[]>((resolve, reject) => {
            return currentZip.loadAsync(content, {base64: true})
                .then((jsZip) => {
                    this.globalJSZip = jsZip;
                    let roomsIndex = jsZip.file("rooms/index.htm");
                    let futureFile: Promise<string> = roomsIndex.async("string");
                    return Promise.resolve(futureFile)
                        .then((currentIndex) => {
                            const parse5 = require("parse5");
                            let parsedData: string = parse5.parse(currentIndex);
                            return this.updateDataStructure(parsedData, id, resolve);
                        });
                }).catch((error) => {
                    return reject(new InsightError());
                });
        });
    }

    private updateDataStructure(parsedData: string, id: string,
                                resolve: (value?: (PromiseLike<string[]> | string[])) => void) {
        return this.getData(parsedData)
            .then((nestedMap) => {
                return this.myInsightFacade.updateDataStructure(id, nestedMap, resolve);
            });
    }

    private getData(parsedData: string): Promise<Map<string, string>> {
        let nestedMap: Map<string, string> = new Map<string, string>();
        let buildingArray = this.findArray(parsedData);
        for (let row of buildingArray) {
            let element = this.findFullNameAndAddressLocation(row);
            let fn: string = this.findFullName(element);
            let sn: string = this.findShortName(row);
            let addr: string = this.findAddress(row);
            let path: string = this.findFileName(element);
            path = "rooms" + path.substring(1);
            let lat = 0; // stub //  http://cs310.students.cs.ubc.ca:11316/api/v1/project_team<TEAM NUMBER>/<ADDRESS>
            let lon = 0; //  6245 Agronomy Road V6T 1Z4 should be represented as 6245%20Agronomy%20Road%20V6T%201Z4)
            let futureFile = this.globalJSZip.file(path);
            let fileData = futureFile.async("string");
            try {
                Promise.resolve(fileData)
                    .then((myFile) => {
                        const parse5 = require("parse5");
                        let parsedBuildingData = parse5.parse(myFile);
                        let roomArray = this.findArray(parsedBuildingData);
                        for (let room of roomArray) {
                            let elem = this.findNumberAndHREFLocation(room);
                            let num = this.findNumber(elem);
                            let name = sn + " " + num;
                            nestedMap.set(name,
                                this.createNewJSONRoomStringData(room, elem, fn, sn, num, name, addr, lat, lon));
                        }
                    });
            } catch (e) {
                continue;
            }
        }
        return Promise.resolve(nestedMap);
    }

    private createNewJSONRoomStringData(roomData: string, element: any, fn: string, sn: string, num: string,
                                        name: string, addr: string, latitude: number, longitude: number): string {
        return JSON.stringify({
            fullName: fn, shortName: sn, number: num, name: name, address: addr, lat: latitude, lon: longitude,
            seats: this.findSeats(roomData), type: this.findType(roomData), furniture: this.findFurniture(roomData),
            href: this.findLink(element),
        });
    }

    private findArray(element: any): any[] {
        let array: any[] = [];
        if (element.nodeName === "div" && element.attrs[0].value.startsWith("view view-buildings-and-classrooms")) {
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
                let possibleArray = this.findArray(child);
                if (possibleArray.length > 0) {
                    return array;
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

    private findFileName(element: any): string {
        if (element.nodeName === "a" && element.attrs[0].name === "href") {
            return element.attrs[0].value;
        }
        if (element.childNodes && element.childNodes.length > 0) {
            for (let child of element.childNodes) {
                let possibleFileName = this.findFileName(child);
                if (possibleFileName !== "") {
                    return possibleFileName;
                }
            }
        }
        return "";
    }

    private findFullName(element: any): string {
        if (element.nodeName === "a" && element.childNodes[0].nodeName === "#text") {
            return element.childNodes[0].value;
        }
        if (element.childNodes && element.childNodes.length > 0) {
            for (let child of element.childNodes) {
                let possibleFullName = this.findFullName(child);
                if (possibleFullName !== "") {
                    return possibleFullName;
                }
            }
        }
        return "";
    }

    private findShortName(element: any): string {
        if (element.nodeName === "td" && element.attrs[0].value === "views-field views-field-field-building-code") {
            return element.childNodes[0].value;
        }
        if (element.childNodes && element.childNodes.length > 0) {
            for (let child of element.childNodes) {
                let possibleShortName = this.findShortName(child);
                if (possibleShortName !== "") {
                    return possibleShortName;
                }
            }
        }
        return "";
    }

    private findAddress(element: any): string {
        if (element.nodeName === "td" && element.attrs[0].value === "views-field views-field-field-building-address") {
            return element.childNodes[0].value;
        }
        if (element.childNodes && element.childNodes.length > 0) {
            for (let child of element.childNodes) {
                let possibleAddress = this.findAddress(child);
                if (possibleAddress !== "") {
                    return possibleAddress;
                }
            }
        }
        return "";
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
            return element.value;
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

    private findSeats(element: any): string {
        if (element.nodeName === "td" &&
            element.attrs[0].value === "views-field views-field-field-room-capacity") {
            return element.childNodes[0].value;
        }
        if (element.childNodes && element.childNodes.length > 0) {
            for (let child of element.childNodes) {
                let possibleSeats = this.findSeats(child);
                if (possibleSeats !== "") {
                    return possibleSeats;
                }
            }
        }
        return "";
    }

    private findType(element: any): string {
        if (element.nodeName === "td" && element.attrs[0].value === "views-field views-field-field-room-type") {
            return element.childNodes[0].value;
        }
        if (element.childNodes && element.childNodes.length > 0) {
            for (let child of element.childNodes) {
                let possibleType = this.findType(child);
                if (possibleType !== "") {
                    return possibleType;
                }
            }
        }
        return "";
    }

    private findFurniture(element: any): string {
        if (element.nodeName === "td" &&
            element.attrs[0].value === "views-field views-field-field-room-furniture") {
            return element.childNodes[0].value;
        }
        if (element.childNodes && element.childNodes.length > 0) {
            for (let child of element.childNodes) {
                let possibleFurniture = this.findFurniture(child);
                if (possibleFurniture !== "") {
                    return possibleFurniture;
                }
            }
        }
        return "";
    }

    private findLink(element: any): string {
        if (element.nodeName === "a" && element.attrs[0].name === "href") {
            return element.attrs[0].value;
        }
        if (element.childNodes && element.childNodes.length > 0) {
            for (let child of element.childNodes) {
                let possibleLink = this.findLink(child);
                if (possibleLink !== "") {
                    return possibleLink;
                }
            }
        }
        return "";
    }
}
