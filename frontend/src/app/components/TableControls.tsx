import { RefreshIcon } from "./icons"
import { Pagination } from "./Pagination"

export default function TableControls({togglePopover, filteredCandidates}: {
    togglePopover: ({targetId}: {targetId: string}) => void,
    filteredCandidates: Record<any, any>[]
}){
    return (
        <div className="flex justify-between items-center mt-5">
                <div className="flex justify-evenly gap-3 items-center">
                    <button className="bg-blue-600 px-6 py-3 rounded-md flex items-center text-white gap-2">
                        Refresh Candidates
                        <RefreshIcon />
                    </button>
                    <button className="text-black" onClick={() => {
                        console.log("clicked")
                        togglePopover({ targetId: "transaction-modal" })
                    }}>
                        Nominate a Candidate
                    </button>
                </div>

                <div className="">
                    <Pagination count={filteredCandidates?.length} />
                </div>
            </div>

    )
}