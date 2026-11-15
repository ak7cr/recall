def precision_recall_f1(predicted, gold):
    p=list(predicted);g=list(gold);tp=sum(x in g for x in p);precision=tp/max(1,len(p));recall=tp/max(1,len(g));return {"precision":precision,"recall":recall,"f1":2*precision*recall/max(1e-12,precision+recall)}
def rouge_n(prediction,reference,n):
    from collections import Counter
    toks=lambda s:[w.casefold() for w in s.split()]
    p=Counter(tuple(toks(prediction)[i:i+n]) for i in range(max(0,len(toks(prediction))-n+1)))
    r=Counter(tuple(toks(reference)[i:i+n]) for i in range(max(0,len(toks(reference))-n+1)))
    overlap=sum((p&r).values());precision=overlap/max(1,sum(p.values()));recall=overlap/max(1,sum(r.values()))
    return 2*precision*recall/max(1e-12,precision+recall)
def rouge_l(prediction, reference):
    a=prediction.lower().split();b=reference.lower().split();dp=[0]*(len(b)+1)
    for x in a:
        prev=0
        for j,y in enumerate(b,1):
            old=dp[j];dp[j]=prev+1 if x==y else max(dp[j],dp[j-1]);prev=old
    l=dp[-1];return 2*l/max(1,len(a)+len(b))
def keyword_coverage(answer, keywords):
    a=answer.lower();return sum(k.lower() in a for k in keywords)/max(1,len(keywords))
def rouge_scores(prediction,reference):
    return {"rouge1":rouge_n(prediction,reference,1),"rouge2":rouge_n(prediction,reference,2),"rougeL":rouge_l(prediction,reference)}
