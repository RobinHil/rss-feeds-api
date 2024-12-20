export interface Article {
    link: string;          // Identifiant unique
    feed_id: number;
    title: string;
    description?: string;
    pub_date?: Date;
    author?: string;
    content?: string;
    guid?: string;        // Certains flux RSS utilisent un GUID différent du lien
    created_at?: Date;
}