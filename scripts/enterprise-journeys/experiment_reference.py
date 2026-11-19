"""Offline development oracle; requires separately installed SciPy/statsmodels.
Prints numerical fixtures only. Neither library is a customer runtime dependency.
"""
import json
import scipy
import statsmodels
from scipy.stats import binomtest
from statsmodels.stats.proportion import confint_proportions_2indep

allocation = []
for c, t, a, b in [(50,50,1,2),(75,25,1,4),(75,25,1,2),(3,12,1,10),(12,3,1,10),(0,7,2,3),(7,0,2,3),(23,17,3,5)]:
    allocation.append(dict(control=c,treatment=t,a=a,b=b,pvalue=float(binomtest(t,c+t,p=a/b,alternative="two-sided").pvalue)))
differences=[]
for c,nc,t,nt in [(6,8,1,5),(20,100,30,100),(0,10,0,10),(10,10,10,10),(0,10,10,10),(1,2,1,100),(1,5000,3,5000),(2500,5000,2501,5000)]:
    lo,hi=confint_proportions_2indep(t,nt,c,nc,method="newcomb",compare="diff",alpha=0.05,correction=False)
    differences.append(dict(control=dict(successes=c,total=nc),treatment=dict(successes=t,total=nt),lower=float(lo),upper=float(hi)))
families=[]
for m in range(1,21):
    lo,hi=confint_proportions_2indep(30,100,20,100,method="newcomb",compare="diff",alpha=0.05/m,correction=False)
    families.append(dict(familySize=m,lower=float(lo),upper=float(hi)))
print(json.dumps(dict(families=families,schemaVersion=1,synthetic=True,scipyVersion=scipy.__version__,statsmodelsVersion=statsmodels.__version__,allocation=allocation,differences=differences),indent=2))
