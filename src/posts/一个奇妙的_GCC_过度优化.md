---
title: 一个奇妙的 GCC 过度优化
date: 2024-09-23 01:32:59
description: '所以为什么 zstd 要 space-optimizd defaults 呢'
tags:
- GCC
- Optimization
- Cpp
---

> 免责声明：本文提到的优化过度应该不属于 bug，并且触发的 case 我暂时并没有想到有什么实际的场景能对应，只是感叹于 O3 优化的奇妙，权当一乐

## 问题
如下的这段代码中，else 里进行现在的 Case A 函数调用，和进行注释掉的 Case B 函数调用，会有性能差别吗？

```cpp
#include <iostream>
#include <chrono>
#include <cstdlib>
#include <vector>
#include <cmath>
#include <unistd.h>

void some_action(size_t& sum, int num)
{
  sum |= (num & 0xFF) << 0;
  sum |= (num & 0xFF00) << 8;
  sum |= (num & 0xFF0000) << 16;
  sum |= (num & 0xFF000000) << 24;
}

void solve(size_t num_bin)
{
  std::vector<int> values(num_bin);
  for (int i = 0; i < num_bin; i++) {
    values[i] = static_cast<int>(std::log2(rand() % 32768 + 1));
  }
  size_t outSize = 0;

  auto begin = std::chrono::steady_clock::now();
  for (auto i = 0; i < num_bin; i++)
  {
    auto v = values[i] % 8 == 0 ? values[i] / 8 : values[i] / 8 + 1;
    if (v < 8) {
        some_action(outSize, values[i]);
        outSize += v;
    } else {
        some_action(outSize, values[i]);
        outSize += v;
        some_action(outSize, values[i]); // Case A
        // some_action(outSize, values[num_bin - i - 1]); // Case B
        outSize += v;
    }
  }
  auto end = std::chrono::steady_clock::now();
  auto duration = std::chrono::duration<double>(end - begin).count();
  std::cout << "Duration: " << duration << std::endl;
  std::cerr << outSize << std::endl;
}

signed main()
{
  srand(19260817);

  for (int i = 0; i < 10; i++) {
    solve(512 * 512 * 512LL * 5);
  }
  return 0;
}
```
按理来说是不会的吧！

```std::log2(rand() % 32768 + 1)``` 生成的数值，不会超出 $log_2(32768)$，也就是 15，换言之，这个值在循环中生成的 v，无论如何都不该大于 8，也就是说，无论我 else 分支怎么改，它都 ***根本不会执行***

但是实际测试中，使用 g++ 14.2 编译的情况下，进行 Case B 调用 比进行 Case A 调用，能快接近一倍。（我的测试环境是本机，不是很严谨，但是这个差距也远远超出了预期的 system uncertainty 的范畴）

## 原因
我把这个程序扔到 [godbolt](https://godbolt.org/z/zeehrfvec) 看了下 asm。
### Case A
对应的 `else` block 的 asm 如下
```asm
or      r13, rax
add     r13, rcx
or      rax, r13
add     rax, rcx
cmp     edx, 8
cmovge  r13, rax
```
那我们很显然可以看出来 `rcx` 寄存器存储的应该就是 `v`，而 `r13` 中存储的就是 `outSize`，`rax` 则存储的是 `values[i]` 在 `some_action` 中处理之后，被用来和 `outSize` or 的值，它这里的逻辑是，先正常调用一次 `some_action` ，也就是 or 指令，然后 add 一次，此时 `r13` 中是 `if` 分支需要的值，然后倒转过来，用 `rax` 存储它和 `r13` or 的结果，此时如果是走 else 分支（也就是 cmp 指令为真），则将 `rax` 的值赋值给 `r13`。

在上述的流程中，else 中的计算，被提前到了条件判断之前计算，也就是说无论是走哪个分支，else 中的两次调用和两次加法都会被执行。

### Case B
这个 if-else 对应的 asm 大概如下
```asm
sal     eax, 8
and     eax, 16711680
movsx   rdi, edx
or      eax, ecx
cdqe
or      rax, rbx
lea     rbx, [rax+rdi]
cmp     edx, 7
jle     .L11
mov     edx, DWORD PTR [rsi]
mov     eax, edx
movzx   edx, dl
sal     eax, 8
and     eax, 16711680
or      eax, edx
cdqe
or      rax, rbx
lea     rbx, [rax+rdi]
```
u1s1 我其实没认真看，可能没严格对应，但是当我看到两次 `sal     eax, 8` 和 `and     eax, 16711680` 出现的时候我就知道这个应该是严格按照 if else 的逻辑运行的了，尤其是里面还有个 jle 指令。

## 结论

我试了 O1/2/3 优化，其中只有 O2/O3 会导致这个问题，想想其实也很合理，因为 O2/3 主要是针对体积优化，对比两个版本的指令数量，显然 Case A 要少很多，但是时间上来说，由于这个优化过度，Case A + O3 的效果还不如 Case A + O1。并且比较扯淡的是我用 `__builtin_expect` 都没法改变这个过度优化，也是道心坚定了。

Anyway，事实上这个 case 是我在模拟某个应用中的一个片段的时候随手写的，而且这个 example 中还做了进一步简化，为了找到这个问题也花了我不少功夫呢，不过目前我感觉这个 case 也比较难触发？所以也只能写出来让大伙乐呵乐呵。

BTW，clang 没有这个问题 :)