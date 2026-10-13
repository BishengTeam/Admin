// 函数形式返回固定命令：lint-staged 不会把暂存文件名拼到命令后，
// 从而全量跑一次 tsc（此前 package.json 里的 "tsc -b --noEmit" 会被拼上
// 文件路径当 tsconfig 项目用，任何含 .ts 的提交都必然失败）。
export default {
  '*.{ts,tsx}': () => 'npm run typecheck',
}
