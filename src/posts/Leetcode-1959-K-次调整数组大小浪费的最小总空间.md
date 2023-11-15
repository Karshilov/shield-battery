---
title: 'Leetcode #1959 K 次调整数组大小浪费的最小总空间'
date: 2021-09-23 11:12:00
description: 'From the data range, it can be inferred that this is likely an interval dynamic programming (dp) problem, and indeed it is. The key to solving this problem lies in finding a calculation method for the changes in wasted space resulting from adjusting once. Placed as the third question in the LeetCode weekly contest, it is of slightly higher difficulty, testing the solidity of foundational knowledge.'
banner: 'https://picsum.photos/300/200'
tags:
- 求职
- 刷题
---

[题目链接](https://leetcode-cn.com/problems/minimum-total-space-wasted-with-k-resizing-operations/)
## 思路简述
+ 数据范围经典 $O(n^3)$ 区间dp
+ 首先是设计dp方程，假设 $dp[i][j]$ 表示数组调整到了i位置并用了j次的最优解
+ 考虑 $j$ 的步长为 $1$ 时，i从 $1$ 到 $n$ 的转移，假设转移长度是从 $i$ 到 $i+len$ ，因为只会调整一次，并且需要大于这个段内的所有值
+ 所以转移方程应该是 $dp[i + len][j] = min(dp[i + len][j], dp[i][j - 1] + maxValue * len - sum[i + len] + sum[i])$
+ 其中的sum是预处理的前缀和数组，因为此时的损耗应该是区间内的最大值 $maxValue$ $*$ 区间长度 $len$ 减去区间内的真实值的和
+ 注意一下预处理就行
  
## Code
```cpp
class Solution {
public:
    int minSpaceWastedKResizing(vector<int>& nums, int k) {
        k++;
        const int n = nums.size();
        vector<vector<int> > dp = vector<vector<int> >(n + 1, vector<int>(k + 1, 0x3f3f3f3f));
        vector<int> a = vector<int>(n + 1, 0);
        vector<int> sum = vector<int>(n + 1, 0);
        for (int i = 1; i <= n; i++) {
            a[i] = nums[i - 1];
            sum[i] = a[i] + sum[i - 1];
        }
        for (int i = 1, mmx = 0; i <= n; i++) {
            mmx = max(mmx, a[i]);
            dp[i][1] = i * mmx - sum[i];
        }
        for (int p = 2; p <= k; p++) {
            for (int i = 1; i < n; i++) {
                for (int j = 1, mmx = a[i + 1], mmn = a[i + 1]; j + i <= n; j++) {
                    mmx = max(mmx, a[i + j]);
                    dp[i + j][p] = min(dp[i][p - 1] + mmx * j - sum[i + j] + sum[i], dp[i + j][p]);
                }
            }
        }
        int ans = 0x3f3f3f3f;
        for (int i = 1; i <= k; i++) {
            ans = min(ans, dp[n][i]);
        }
        return ans;
    }
};
```