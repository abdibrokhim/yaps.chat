"use client"

import { FOOTER_TEXT } from "@/lib/config"

export function Footer() {
    return (
        <footer className="h-app-footer fixed bottom-0 right-0 left-0 z-10 py-1 flex flex-wrap items-center justify-center w-full mx-auto max-w-2xl">
            <p className="text-[9px] dark:text-zinc-800 text-zinc-100">{FOOTER_TEXT}</p>
        </footer>
    )
}
