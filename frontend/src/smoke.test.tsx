import {afterEach,describe,expect,it,vi}from'vitest';
import {render,screen,cleanup}from'@testing-library/react';
import {MemoryRouter}from'react-router-dom';
import {QueryClient,QueryClientProvider}from'@tanstack/react-query';
import App from'./ui';import{api}from'./api';
afterEach(()=>{cleanup();vi.restoreAllMocks()});
function page(path:string,getData:any){
  vi.spyOn(api,'get').mockImplementation((url:any)=>Promise.resolve({data:getData(url)} as any));
  render(<MemoryRouter initialEntries={[path]}><QueryClientProvider client={new QueryClient()}><App/></QueryClientProvider></MemoryRouter>);
}
describe('Recall page smoke tests',()=>{
 it('renders dashboard',()=>{page('/',()=>({totals:{},upcoming_deadlines:[],recent_meetings:[],recent_decisions:[],actions_by_assignee:[],meetings_per_week:[]}));expect(screen.getByText('Meeting activity')).toBeInTheDocument()});
 it('renders upload page',()=>{page('/upload',()=>[]);expect(screen.getByText('Add meetings')).toBeInTheDocument()});
 it('renders a meeting workspace',async()=>{page('/meetings/m1',(url:string)=>url==='/meetings/m1'?{id:'m1',title:'Design review',meeting_date:'2024-11-12',status:'ready',summaries:[],topics:[],entities:[],decisions:[],action_items:[],participants:[]}:[{idx:1,speaker:'Rahul',text:'Hello'}]);expect(await screen.findByText('Design review')).toBeInTheDocument()});
 it('renders chat prompts',()=>{page('/chat',()=>[]);expect(screen.getByText('What would you like to recall?')).toBeInTheDocument()});
 it('renders action tracker',()=>{page('/actions',()=>[]);expect(screen.getByRole('heading',{name:'Action tracker',level:1})).toBeInTheDocument()});
});
