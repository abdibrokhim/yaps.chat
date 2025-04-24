import { GroupJoinMethod, Preference } from "./chat";

export type UserProfile = {
    user_id: string;
    username: string;
    preference: Preference;
    gender: string;
    room_type: string;
    group_code?: string;
    group_join_method?: GroupJoinMethod;
};