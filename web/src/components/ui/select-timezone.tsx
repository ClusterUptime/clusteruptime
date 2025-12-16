import * as React from "react"
import { Check, ChevronsUpDown } from "lucide-react"

import { cn } from "@/lib/utils"
import { Button } from "@/components/ui/button"
import {
    Command,
    CommandEmpty,
    CommandGroup,
    CommandInput,
    CommandItem,
    CommandList,
} from "@/components/ui/command"
import {
    Popover,
    PopoverContent,
    PopoverTrigger,
} from "@/components/ui/popover"

export function SelectTimezone({ value, onValueChange, className }: { value?: string, onValueChange?: (value: string) => void, className?: string }) {
    const [open, setOpen] = React.useState(false)

    // 1. Get all supported timezones
    const allTimezones = React.useMemo(() => Intl.supportedValuesOf('timeZone'), []);

    // 2. Group them by region (e.g. America, Europe, Asia, etc.)
    const groupedTimezones = React.useMemo(() => {
        return allTimezones.reduce((acc, tz) => {
            const parts = tz.split('/');
            const region = parts.length > 1 ? parts[0] : 'Others';

            if (!acc[region]) {
                acc[region] = [];
            }
            acc[region].push(tz);
            return acc;
        }, {} as Record<string, string[]>);
    }, [allTimezones]);

    // 3. Sort regions
    const sortedRegions = React.useMemo(() => {
        return Object.keys(groupedTimezones).sort((a, b) => {
            if (a === 'Others') return 1;
            if (b === 'Others') return -1;
            return a.localeCompare(b);
        });
    }, [groupedTimezones]);

    return (
        <Popover open={open} onOpenChange={setOpen}>
            <PopoverTrigger asChild>
                <Button
                    variant="outline"
                    role="combobox"
                    aria-expanded={open}
                    className={cn("w-full justify-between", className)}
                >
                    {value
                        ? value.replace(/_/g, " ")
                        : "Select timezone..."}
                    <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                </Button>
            </PopoverTrigger>
            <PopoverContent className="w-[300px] p-0">
                <Command>
                    <CommandInput placeholder="Search timezone..." />
                    <CommandList>
                        <CommandEmpty>No timezone found.</CommandEmpty>
                        {sortedRegions.map(region => (
                            <CommandGroup key={region} heading={region}>
                                {groupedTimezones[region].map(tz => (
                                    <CommandItem
                                        key={tz}
                                        value={tz}
                                        onSelect={() => {
                                            onValueChange?.(tz)
                                            setOpen(false)
                                        }}
                                    >
                                        <Check
                                            className={cn(
                                                "mr-2 h-4 w-4",
                                                value === tz ? "opacity-100" : "opacity-0"
                                            )}
                                        />
                                        {tz.replace(/_/g, " ")}
                                    </CommandItem>
                                ))}
                            </CommandGroup>
                        ))}
                    </CommandList>
                </Command>
            </PopoverContent>
        </Popover>
    )
}
