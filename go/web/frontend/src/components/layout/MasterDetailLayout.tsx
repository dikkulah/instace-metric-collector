import type { ReactNode, RefObject } from 'react'

export type SplitSurface = 'page' | 'containerDetail'
export type MasterRatio = '60/40' | '55/45'

const ratioClass: Record<MasterRatio, string> = {
  '60/40': 'lg:grid-cols-[minmax(0,3fr)_minmax(0,2fr)]',
  '55/45': 'lg:grid-cols-[minmax(0,55%)_minmax(0,45%)]',
}

export function MasterDetailLayout({
  surface = 'page',
  masterRatio = '60/40',
  master,
  detail,
  detailRef,
}: {
  surface?: SplitSurface
  masterRatio?: MasterRatio
  master: ReactNode
  detail: ReactNode
  detailRef?: RefObject<HTMLDivElement | null>
}) {
  if (surface === 'containerDetail') {
    return (
      <div className="flex flex-col gap-3 min-h-0 min-w-0 h-full">
        <div className="panel overflow-hidden flex flex-col min-w-0 max-h-[min(42vh,360px)] shrink-0">
          {master}
        </div>
        <div ref={detailRef} className="flex-1 min-h-0 min-w-0 overflow-hidden">
          {detail}
        </div>
      </div>
    )
  }

  return (
    <div
      className={`grid grid-cols-1 ${ratioClass[masterRatio]} gap-4 h-full min-h-0 min-w-0 overflow-hidden lg:items-stretch`}
    >
      <div className="panel overflow-hidden flex flex-col min-h-0 min-w-0 h-full max-h-full max-lg:min-h-[280px]">
        {master}
      </div>
      <div
        ref={detailRef}
        className="min-h-0 min-w-0 h-full max-h-full overflow-hidden flex flex-col max-lg:min-h-[280px] [&>*]:h-full [&>*]:min-h-0"
      >
        {detail}
      </div>
    </div>
  )
}
