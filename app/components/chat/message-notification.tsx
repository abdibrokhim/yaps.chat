import { Tooltip, TooltipTrigger, TooltipContent } from "@/components/ui/tooltip"
  
type MessageNotificationProps = {
    mKey: string
    notificationMessage: string
    groupCode: string
    onShowShareDialog: (show: boolean) => void
}

export function MessageNotification({
    mKey,
    notificationMessage,
    groupCode,
    onShowShareDialog
}: MessageNotificationProps) {
    return (
        <div key={mKey} className="flex flex-col items-center gap-1 py-2">
            <div className="bg-zinc-50 dark:bg-zinc-900/50 border border-zinc-100 dark:border-zinc-800/50 text-zinc-500 dark:text-zinc-400 rounded-md py-1 px-2 text-[10px]">
                {notificationMessage.split(':')[0]}: {' '}
            <Tooltip>
                <TooltipTrigger asChild>
                    <span 
                        className="cursor-pointer hover:text-primary italic"
                        onClick={() => onShowShareDialog(true)}
                    >
                        {groupCode}
                    </span>
                </TooltipTrigger>
                <TooltipContent>Click to share this chat</TooltipContent>
            </Tooltip>
            </div>
        </div>
    )
}
