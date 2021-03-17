export abstract class QueryFields {
    protected Mfield: string[];
    protected Sfield: string[];

    public includesMField(field: string) {
        return this.Mfield.includes(field);
    }

    public includesSField(field: string) {
        return this.Sfield.includes(field);
    }
}

export class CoursesFields extends QueryFields {
    constructor() {
        super();
        this.Mfield = ["avg", "pass", "fail", "audit", "year"];
        this.Sfield = ["dept", "id", "instructor", "title", "uuid"];
    }
}

export class RoomsFields extends QueryFields {
    constructor() {
        super();
        this.Mfield = ["lat", "lon", "seats"];
        this.Sfield = ["fullname", "shortname", "number", "name", "address", "type", "furniture", "href"];
    }
}
