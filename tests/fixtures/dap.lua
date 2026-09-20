global print, os, js
local 中文变量 = 0
local function 读取时间()
  return os.time()
end
-- @relocate-deep-call
print(读取时间()) -- @deep-call
print(os.time()) -- @os-time
js.call("timer.sleep", 10) -- @async-capability
local 步进完成 = true -- @after-capability
for i = 1, 3 do
  中文变量 = 中文变量 + 21
  print("DAP 中文冒烟", i, 中文变量)
end
local 计时器 = os.clock()
return 中文变量, 步进完成
