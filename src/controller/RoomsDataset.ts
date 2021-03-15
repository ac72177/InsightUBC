import * as JSZip from "jszip";
import {InsightDataset, InsightDatasetKind, InsightError} from "./IInsightFacade";
import InsightFacade from "./InsightFacade";

export class RoomsDataset {
    private myInsightFacade: InsightFacade;
    constructor(param: InsightFacade) {
        this.myInsightFacade = param;
    }

    public promiseToAddVerifiedDataset(id: string, content: string): Promise<string[]> {
        let currentZip = new JSZip();
        return new Promise<string[]>((resolve, reject) => {
            return currentZip.loadAsync(content, {base64: true})
                .then((jsZip) => {
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

    private updateDataStructure(parsedData: string,
                                id: string,
                                resolve: (value?: (PromiseLike<string[]> | string[])) => void) {
        return this.getData(parsedData)
            .then((nestedMap) => {
                return this.myInsightFacade.updateDataStructure(id, nestedMap, resolve);
            });
    }

    private getData(parsedData: string): Promise<Map<string, string>> {
        let nestedMap: Map<string, string> = new Map<string, string>();
        let buildingArray = this.findBuildingArray(parsedData);
        for (let row of buildingArray) {
            let fullName: string = this.findFullName(row);
            let shortName: string = this.findShortName(row);
            let addr: string = this.findAddress(row);
            //  http://cs310.students.cs.ubc.ca:11316/api/v1/project_team<TEAM NUMBER>/<ADDRESS>
            // e.g., 6245 Agronomy Road V6T 1Z4 should be represented as 6245%20Agronomy%20Road%20V6T%201Z4)
            let lat = 0; // stub
            let lon = 0; // stub
            let roomArray = this.findRoomArray(row);
            for (let room of roomArray) {
                nestedMap.set(shortName, this.createNewJSONRoomStringData(room, fullName, shortName, addr, lat, lon));
            }
        }
        return Promise.resolve(nestedMap);
    }

    private createNewJSONRoomStringData(roomData: string, fn: string, sn: string, addr: string,
                                        latitude: number, longitude: number): string {
        return JSON.stringify({
            fullName: fn,
            shortName: sn,
            number: this.findNumber(roomData),
            name: fn + " " + this.findNumber(roomData),
            address: addr,
            lat: latitude,
            lon: longitude,
            seats: this.findSeats(roomData),
            type: this.findType(roomData),
            furniture: this.findFurniture(roomData),
            href: this.findLink(roomData),
        });
    }

    private findBuildingArray(parsedIndexData: string): string[] {
        return null;
    }

    private findRoomArray(parsedBuildingData: string): string[] {
        return null;
    }

    private findFullName(roomData: string): string {
        return null;
    }

    private findShortName(roomData: string): string {
        return null;
    }

    private findAddress(roomData: string): string {
        return null;
    }

    private findNumber(roomData: string): string[] {
        return null;
    }

    private findSeats(roomData: string): string {
        return null;
    }

    private findType(roomData: string): string {
        return null;
    }

    private findFurniture(roomData: string): string {
        return null;
    }

    private findLink(roomData: string): string {
        return null;
    }
}
