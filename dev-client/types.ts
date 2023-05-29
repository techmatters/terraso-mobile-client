export type ProjectDescription = {
    id: number;
    name: string;
    description: string;
    siteCount: number;
    userCount: number;
    // TODO: check how this is being typed in Typescript PR
    lastModified: string;
    isNew: boolean;
};
