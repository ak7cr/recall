import axios from 'axios';
export const api=axios.create({baseURL:'http://localhost:8000/api'});
export type Meeting={id:string;title:string;meeting_date:string;status:string;participants?:{speaker_name:string;utterance_count:number;word_count:number}[];action_items?:Action[];decisions?:Decision[];summaries?:{method:string;summary_text:string;is_primary:boolean}[];topics?:{topic:string}[];entities?:{text:string;label:string;utterance_idx:number}[]};
export type Action={id:string;meeting_id:string;task:string;assignee?:string;deadline_date?:string;deadline_text?:string;status:string;evidence_quote:string;evidence_utterance_idx:number;assignee_explicit:boolean;deadline_explicit:boolean};
export type Decision={id:string;meeting_id:string;decision:string;status:string;evidence_quote:string;evidence_utterance_idx:number};
