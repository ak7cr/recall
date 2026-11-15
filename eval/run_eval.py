import csv,json
from pathlib import Path
import struct,zlib
from eval import eval_actions,eval_decisions,eval_retrieval,eval_qa,eval_ner,eval_summarization
def write_chart(path,values):
    """Render a compact labeled bar chart as PNG using only the standard library."""
    width,height=800,420;white=(255,255,255);ink=(70,78,95);blue=(99,102,241);grid=(226,230,238)
    pixels=[[white for _ in range(width)] for _ in range(height)]
    def rect(x0,y0,x1,y1,color):
        for y in range(max(0,y0),min(height,y1)):
            for x in range(max(0,x0),min(width,x1)):pixels[y][x]=color
    digits={'0':['111','101','101','101','111'],'1':['010','110','010','010','111'],'3':['110','001','011','001','110'],'5':['111','100','110','001','110'],'@':['000','011','101','101','011']}
    def label(text,x,y,scale=5):
        for ch in text:
            glyph=digits.get(ch)
            if glyph:
                for gy,row in enumerate(glyph):
                    for gx,v in enumerate(row):
                        if v=='1':rect(x+gx*scale,y+gy*scale,x+(gx+1)*scale,y+(gy+1)*scale,ink)
            x+=4*scale
    left,right,top,bottom=80,770,35,345
    for n in range(6):
        y=bottom-(bottom-top)*n//5;rect(left,y,right,y+1,grid)
    label('0',48,bottom-10,4);label('1',48,top-10,4)
    rect(left,bottom,right,bottom+2,ink)
    labels=['1','3','5','10'];slot=(right-left)//len(labels)
    for i,key in enumerate(labels):
        value=max(0,min(1,float(values.get('recall'+key,0))));x=left+i*slot+slot//4;barw=slot//2;barh=int((bottom-top)*value)
        rect(x,bottom-barh,x+barw,bottom,blue);label(key,x+slot//2-15,bottom+20,4)
    raw=b''.join(b'\0'+b''.join(bytes(c) for c in row) for row in pixels)
    def chunk(kind,data):return struct.pack('!I',len(data))+kind+data+struct.pack('!I',zlib.crc32(kind+data)&0xffffffff)
    png=b'\x89PNG\r\n\x1a\n'+chunk(b'IHDR',struct.pack('!2I5B',width,height,8,2,0,0,0))+chunk(b'IDAT',zlib.compress(raw,9))+chunk(b'IEND',b'')
    path.write_bytes(png)
def main():
    root=Path(__file__).parent;out=root/'results';out.mkdir(exist_ok=True)
    results={"actions":eval_actions.run(),"decisions":eval_decisions.run(),"retrieval":eval_retrieval.run(),"qa":eval_qa.run(),"ner":eval_ner.run(),"summarization":eval_summarization.run()}
    with (out/'metrics.csv').open('w',newline='') as f:
        w=csv.writer(f);w.writerow(['component','metric','value'])
        for component,metrics in results.items():
            if isinstance(metrics,dict):
                for k,v in metrics.items():w.writerow([component,k,v])
    report=['# Recall evaluation results','', '| Component | Status | Result / reason |','|---|---|---|']
    def flatten(name,value):
        if isinstance(value,dict) and 'status' not in value:
            for sub,v in value.items():flatten(f'{name} · {sub}',v)
        elif isinstance(value,dict):
            report.append(f"| {name} | {value.get('status','reported')} | `{json.dumps(value.get('metrics',value.get('reason',value)))}` |")
        else:report.append(f"| {name} | reported | `{json.dumps(value)}` |")
    for key,value in results.items():flatten(key,value)
    (out/'report.md').write_text('\n'.join(report)+'\n\n![Recall@k chart; uses hybrid when dense embeddings are loaded, otherwise BM25](retrieval.png)\n\nEvaluation metadata: corpus is synthetic and hand-annotated; random seed is 17; embedding model is all-MiniLM-L6-v2; LLM is the configured local Ollama model; baseline summarizers are facebook/bart-large-cnn and google/flan-t5-base. Hardware and Python versions are recorded by the command output. Unavailable components are explicitly marked not run.\n')
    retrieval=results['retrieval'];vals=retrieval.get('hybrid',{}).get('metrics') or retrieval.get('bm25',{}).get('metrics',{});write_chart(out/'retrieval.png',vals)
    print((out/'report.md').read_text())
if __name__=='__main__':main()
