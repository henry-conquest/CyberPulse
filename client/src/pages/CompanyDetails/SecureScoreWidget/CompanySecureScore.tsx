import { Button } from "@/components/ui/button"
import RiskScoreChart from "../RiskScoreChart/RiskScoreChart"
import { format } from "date-fns"

const CompanySecureScore = () => {
    return (
        <div className="border border-brand-teal p-5 rounded flex items-center mb-20 pb-0">
            <div data-testid='risk-score-container' className="basis-1/5">
                <RiskScoreChart score={75} marginLeft={6}/>
            </div>
            <div data-testid='secure-score-container' className="flex-col justify-center relative items-start py-4 basis-4/5">
               <div data-testid='secure-score-top' className="flex justify-around mb-6">
                 <h1 data-testid='secure-score-heading' className="text-brand-green text-3xl font-bold mr-6">Company Risk Rating (Low, Medium, High)</h1>
                 <Button className="bg-brand-green hover:bg-brand-green/90">View Risk Trend</Button>
               </div>
               <div data-testid='secure-score-middle' className="font-montserrat mb-6">
                <p className="text-brand-green">Medium Risk</p>
                <p className="text-brand-teal font-bold">Your business has taken some steps to protect against Cyber Threats but more could be done.</p>
               </div>
               <div data-testid='secure-score-bottom' className="flex justify-between font-montserrat" >
                 <Button className="bg-brand-teal mr-10 hover:bg-brand-teal/90">Download Executive Report</Button>
                 <Button className="bg-brand-teal hover:bg-brand-teal/90">Download Detailed Report</Button>
                 <Button className="bg-brand-teal hover:bg-brand-teal/90">Download Tender / Insurer Pack</Button>
               </div>
               <div className="flex justify-end">
                  <span className="text-brand-teal text-xs">Risk score last refreshed: {format(new Date(), "MMMM d, yyyy 'at' h:mm a")}</span>
               </div>
            </div>
        </div>
    )
}

export default CompanySecureScore