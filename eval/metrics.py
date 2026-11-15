def precision_recall_f1(predicted, gold):
    p=set(predicted);g=set(gold);tp=len(p&g);precision=tp/max(1,len(p));recall=tp/max(1,len(g));return {"precision":precision,"recall":recall,"f1":2*precision*recall/max(1e-12,precision+recall)}
def rouge_l(prediction, reference):
    a=prediction.lower().split();b=reference.lower().split();dp=[0]*(len(b)+1)
    for x in a:
        prev=0
        for j,y in enumerate(b,1):
            old=dp[j];dp[j]=prev+1 if x==y else max(dp[j],dp[j-1]);prev=old
    l=dp[-1];return 2*l/max(1,len(a)+len(b))
def keyword_coverage(answer, keywords):
    a=answer.lower();return sum(k.lower() in a for k in keywords)/max(1,len(keywords))
