import re

file_path = '/Users/bytedance/Documents/project/go/v/v-platform-console-frontend/src/modules/catalog/pages/CatalogPage.tsx'

with open(file_path, 'r') as f:
    content = f.read()

# The tab bar block
tab_bar_code = """
      <motion.div variants={itemVariants} className="min-w-0 flex flex-col gap-6">
        <div className="flex w-full min-w-0 overflow-x-auto border-b border-white/10">
          <div className="flex min-w-0 shrink-0 gap-6">
            {[
              { id: 'sku', label: 'SKU' },
              { id: 'package', label: 'Package' },
              { id: 'billable', label: 'Billable Item' },
              { id: 'rate-card', label: 'Rate Card' },
              { id: 'asset', label: 'Asset Definition' },
              { id: 'policy', label: 'Allowance Policy' },
              { id: 'api', label: 'Developer API' },
            ].map(tab => {
              const isActive = activeTab === tab.id
              return (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id as any)}
                  className={`relative pb-3 text-sm font-medium outline-none transition-colors ${
                    isActive ? 'text-white' : 'text-slate-400 hover:text-slate-200'
                  }`}
                >
                  {tab.label}
                  {isActive && (
                    <motion.div
                      layoutId="activeTabIndicator"
                      className="absolute bottom-0 left-0 right-0 h-[2px] bg-white"
                      transition={{ type: 'spring', stiffness: 300, damping: 30 }}
                    />
                  )}
                </button>
              )
            })}
          </div>
        </div>

        <div className="min-w-0 relative">
          <AnimatePresence mode="wait">
"""

# We need to find the sections
# SKU 列表
content = content.replace(
    '      <motion.div variants={itemVariants} className="min-w-0">\n        <SectionCard title="SKU 列表"',
    tab_bar_code + '            {activeTab === \'sku\' && (\n              <motion.div key="tab-sku" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }} transition={{ duration: 0.15 }} className="min-w-0">\n                <SectionCard title="SKU 列表"'
)

# Package 列表
content = content.replace(
    '      </motion.div>\n\n      <motion.div variants={itemVariants} className="min-w-0">\n        <SectionCard title="Package 列表"',
    '              </motion.div>\n            )}\n\n            {activeTab === \'package\' && (\n              <motion.div key="tab-package" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }} transition={{ duration: 0.15 }} className="min-w-0">\n                <SectionCard title="Package 列表"'
)

# Billable Item 列表
content = content.replace(
    '      </motion.div>\n\n      <motion.div variants={itemVariants} className="min-w-0">\n        <SectionCard title="Billable Item 列表"',
    '              </motion.div>\n            )}\n\n            {activeTab === \'billable\' && (\n              <motion.div key="tab-billable" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }} transition={{ duration: 0.15 }} className="min-w-0">\n                <SectionCard title="Billable Item 列表"'
)

# Rate Card 列表
content = content.replace(
    '      </motion.div>\n\n      <motion.div variants={itemVariants} className="min-w-0">\n        <SectionCard title="Rate Card 列表"',
    '              </motion.div>\n            )}\n\n            {activeTab === \'rate-card\' && (\n              <motion.div key="tab-rate-card" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }} transition={{ duration: 0.15 }} className="min-w-0">\n                <SectionCard title="Rate Card 列表"'
)

# Asset Definition 列表
content = content.replace(
    '      </motion.div>\n\n      <motion.div variants={itemVariants} className="min-w-0">\n        <SectionCard title="Asset Definition 列表"',
    '              </motion.div>\n            )}\n\n            {activeTab === \'asset\' && (\n              <motion.div key="tab-asset" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }} transition={{ duration: 0.15 }} className="min-w-0">\n                <SectionCard title="Asset Definition 列表"'
)

# Allowance Policy 列表
content = content.replace(
    '      </motion.div>\n\n      <motion.div variants={itemVariants} className="min-w-0">\n        <SectionCard title="Allowance Policy 列表"',
    '              </motion.div>\n            )}\n\n            {activeTab === \'policy\' && (\n              <motion.div key="tab-policy" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }} transition={{ duration: 0.15 }} className="min-w-0">\n                <SectionCard title="Allowance Policy 列表"'
)

# 业务访问接口
content = content.replace(
    '      </motion.div>\n\n      <motion.div variants={itemVariants} className="min-w-0">\n        <SectionCard title="业务访问接口"',
    '              </motion.div>\n            )}\n\n            {activeTab === \'api\' && (\n              <motion.div key="tab-api" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }} transition={{ duration: 0.15 }} className="min-w-0">\n                <SectionCard title="业务访问接口"'
)

# Closing the activeTab and the main tab container
content = content.replace(
    '      </motion.div>\n\n      <AnimatePresence>',
    '              </motion.div>\n            )}\n          </AnimatePresence>\n        </div>\n      </motion.div>\n\n      <AnimatePresence>'
)

with open(file_path, 'w') as f:
    f.write(content)
