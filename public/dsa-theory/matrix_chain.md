This topic explains the DP solution for optimal matrix chain multiplication parenthesization.

Example:

p = [4, 10, 3, 12, 20, 7]

We compute m[i,j] level-wise.

The main formula is:

\\[
m[i,j] = \min_{i \le k < j} \{ m[i,k] + m[k+1,j] + p_{i-1} p_k p_j \}
\\]

with boundary:

\\[
m[i,i] = 0
\\]

We fill the DP table by chain length:

L = j – i + 1

- Level 1 (L=1): Diagonal entries m[i,i] = 0
- Level 2 (L=2): Only one k value → direct multiplication cost
- Level 3+ (L ≥ 3): Multiple k values → test all k from i to j−1 and choose minimum
