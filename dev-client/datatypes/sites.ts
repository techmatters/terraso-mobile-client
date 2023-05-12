export type Point2D = [number, number];

export class DisplaySite {
    lat: number;
    lon: number;
    name: string;

    constructor(lat: number, lon: number, name: string) {
        this.lat = lat;
        this.lon = lon;
        this.name = name;
    }

    get key() {
        return `{this.lat},{this.lon},{this.name}`;
    }
}
