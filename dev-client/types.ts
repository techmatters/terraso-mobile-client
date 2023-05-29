export type ProjectPreview = {
    id: number;
    name: string;
    description: string;
    siteCount: number;
    userCount: number;
    // TODO: check how this is being typed in Typescript PR
    lastModified: string;
    percentComplete: number;
    isNew: boolean;
};

export type Project = {
    meta: ProjectPreview
}
