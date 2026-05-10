import { Toaster } from "sonner";
import { Route, Switch } from "wouter";
import Home from "./pages/Home";
import EvaluationStandards from "./pages/EvaluationStandards";
import TechniqueFeeCalculator from "./pages/TechniqueFeeCalculator";
import DefectDatabase from "./pages/DefectDatabase";
import ProfessionalLevels from "./pages/ProfessionalLevels";
import ImageAnalysis from "./pages/ImageAnalysis";
import NotFound from "./pages/NotFound";

export default function App() {
  return (
    <>
      <Toaster richColors position="top-right" />
      <Switch>
        <Route path="/" component={Home} />
        <Route path="/standards" component={EvaluationStandards} />
        <Route path="/calculator" component={TechniqueFeeCalculator} />
        <Route path="/defects" component={DefectDatabase} />
        <Route path="/levels" component={ProfessionalLevels} />
        <Route path="/image-analysis" component={ImageAnalysis} />
        <Route component={NotFound} />
      </Switch>
    </>
  );
}
