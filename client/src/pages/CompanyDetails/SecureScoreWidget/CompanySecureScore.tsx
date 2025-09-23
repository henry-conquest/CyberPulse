import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import RiskScoreChart from "../RiskScoreChart/RiskScoreChart";
import { format } from "date-fns";
import axios from "axios";
import { useDispatch } from "react-redux";
import { scoresActions } from "@/store/store";

interface CompanySecureScoreProps {
  tenantId: string;
}

const CompanySecureScore = ({ tenantId }: CompanySecureScoreProps) => {
  const [score, setScore] = useState<number>(0);
  const [maxScore, setMaxScore] = useState<number>(300);
  const [loading, setLoading] = useState<boolean>(true);
  const [lastUpdated, setLastUpdated] = useState<Date>(new Date());
  const dispatch = useDispatch()

  useEffect(() => {
    const fetchScore = async () => {
      setLoading(true);
      try {
        const res = await axios.post(`/api/tenants/${tenantId}/scores`);
        setScore(res.data.totalScore);
        setMaxScore(res.data.maxScore);
        setLastUpdated(new Date());
        dispatch(scoresActions.setMaturityScore(Math.round((res.data.totalScore / res.data.maxScore) * 100)))
      } catch (err) {
        console.error("Failed to fetch score:", err);
      } finally {
        setLoading(false);
      }
    };

    fetchScore();
  }, [tenantId]);

  return (
    <div className="border border-brand-teal p-5 rounded flex items-center mb-20 pb-0">
      <div data-testid='risk-score-container' className="basis-1/5">
        <RiskScoreChart score={Math.round((score / maxScore) * 100)} loading={loading} marginLeft={6}/>
      </div>
      <div data-testid='secure-score-container' className="flex-col justify-center relative items-start py-4 basis-4/5">
        <div data-testid='secure-score-top' className="flex justify-around mb-6">
          <h1 data-testid='secure-score-heading' className="text-brand-green text-3xl font-bold mr-6">Maturity Rating</h1>
          <Button className="bg-brand-green hover:bg-brand-green/90">Maturity History</Button>
        </div>
        <div data-testid='secure-score-middle' className="font-montserrat mb-6">
          {/* <p className="text-brand-green">{loading ? "Loading..." : `${Math.round((score / maxScore) * 100)}%`}</p> */}
          <p className="text-brand-teal font-bold">
            Your business has taken some steps to protect against Cyber Threats but more could be done.
          </p>
        </div>
        <div data-testid='secure-score-bottom' className="flex justify-around font-montserrat">
          <Button className="bg-brand-teal mr-10 hover:bg-brand-teal/90">Download Executive Report</Button>
          <Button className="bg-brand-teal hover:bg-brand-teal/90">Download Tender / Insurer Pack</Button>
        </div>
      </div>
    </div>
  );
};

export default CompanySecureScore;
