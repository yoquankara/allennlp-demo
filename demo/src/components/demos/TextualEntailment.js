import React from 'react';
import { API_ROOT } from '../../api-config';
import { withRouter } from 'react-router-dom';
import HeatMap from '../HeatMap'
import SaliencyComponent from '../Saliency'
import InputReductionComponent from '../InputReduction'
import HotflipComponent from '../Hotflip'
import Model from '../Model'
import OutputField from '../OutputField'
import {
  Accordion,
  AccordionItem,
  AccordionItemTitle,
  AccordionItemBody,
  } from 'react-accessible-accordion';
import '../../css/TeComponent.css';
import {
  GRAD_INTERPRETER,
  IG_INTERPRETER,
  SG_INTERPRETER,
  INPUT_REDUCTION_ATTACKER,
  HOTFLIP_ATTACKER
} from '../InterpretConstants'

const apiUrl = () => `${API_ROOT}/predict/textual-entailment`
const apiUrlAttack = ({attacker, name_of_input_to_attack, name_of_grad_input}) => `${API_ROOT}/attack/textual-entailment/${attacker}/${name_of_input_to_attack}/${name_of_grad_input}`
const apiUrlInterpret = ({interpreter}) => `${API_ROOT}/interpret/textual-entailment/${interpreter}`

const title = "Textual Entailment"

const NAME_OF_INPUT_TO_ATTACK = "hypothesis"
const NAME_OF_GRAD_INPUT = "grad_input_1"

const description = (
  <span>
    <span>
    Textual Entailment (TE) takes a pair of sentences and predicts whether the facts in the first
    necessarily imply the facts in the second one.  The AllenNLP toolkit provides the following TE visualization,
    which can be run for any TE model you develop.
    This page demonstrates a reimplementation of
    </span>
    <a href = "https://www.semanticscholar.org/paper/A-Decomposable-Attention-Model-for-Natural-Languag-Parikh-T%C3%A4ckstr%C3%B6m/07a9478e87a8304fc3267fa16e83e9f3bbd98b27" target="_blanke" rel="noopener noreferrer">{' '} the decomposable attention model (Parikh et al, 2017) {' '}</a>
    <span>
    , which was state of the art for
    </span>
    <a href = "https://nlp.stanford.edu/projects/snli/" target="_blank" rel="noopener noreferrer">{' '} the SNLI benchmark {' '}</a>
    <span>
    (short sentences about visual scenes) in 2016.
    Rather than pre-trained Glove vectors, this model uses <a href="https://arxiv.org/abs/1802.05365">ELMo embeddings</a>, which are completely character based and improve performance by 2%
    </span>
  </span>
  );

const descriptionEllipsed = (
  <span>
    Textual Entailment (TE) takes a pair of sentences and predicts whether the facts in the first necessarily imply the…
  </span>
)

const fields = [
  {name: "premise", label: "Premise", type: "TEXT_INPUT",
   placeholder: 'E.g. "A large, gray elephant walked beside a herd of zebras."'},
  {name: "hypothesis", label: "Hypothesis", type: "TEXT_INPUT",
   placeholder: 'E.g. "The elephant was lost."'}
]

const TeGraph = ({x, y}) => {
  const width = 224;
  const height = 194;

  const absoluteX = Math.round(x * width);
  const absoluteY = Math.round((1.0 - y) * height);

  const plotCoords = {
    left: `${absoluteX}px`,
    top: `${absoluteY}px`,
  };

  return (
    <div className="te-graph-labels">
    <div className="te-graph">
      <div className="te-graph__point" style={plotCoords}></div>
    </div>
    </div>
  )
}

const judgments = {
  CONTRADICTION: <span>the premise <strong>contradicts</strong> the hypothesis</span>,
  ENTAILMENT: <span>the premise <strong>entails</strong> the hypothesis</span>,
  NEUTRAL: <span>there is <strong>no correlation</strong> between the premise and hypothesis</span>
}

const Output = ({ responseData, requestData, interpretData, interpretModel, attackData, attackModel}) => {
  const { label_probs, h2p_attention, p2h_attention, premise_tokens, hypothesis_tokens } = responseData
  const [entailment, contradiction, neutral] = label_probs

  // Find judgment and confidence.
  let judgment
  let confidence

  if (entailment > contradiction && entailment > neutral) {
    judgment = judgments.ENTAILMENT
    confidence = entailment
  }
  else if (contradiction > entailment && contradiction > neutral) {
    judgment = judgments.CONTRADICTION
    confidence = contradiction
  }
  else if (neutral > entailment && neutral > contradiction) {
    judgment = judgments.NEUTRAL
    confidence = neutral
  } else {
    throw new Error("cannot form judgment")
  }

  // Create summary text.
  const veryConfident = 0.75;
  const somewhatConfident = 0.50;
  let summaryText

  if (confidence >= veryConfident) {
    summaryText = (
      <div>
        It is <strong>very likely</strong> that {judgment}.
      </div>
    )
  } else if (confidence >= somewhatConfident) {
    summaryText = (
      <div>
        It is <strong>somewhat likely</strong> that {judgment}.
      </div>
    )
  } else {
    summaryText = (
      <div>The model is not confident in its judgment.</div>
      )
  }

  function formatProb(n) {
  return parseFloat((n * 100).toFixed(1)) + "%";
  }

  // https://en.wikipedia.org/wiki/Ternary_plot#Plotting_a_ternary_plot
  const a = contradiction;
  const b = neutral;
  const c = entailment;
  const x = 0.5 * (2 * b + c) / (a + b + c)
  const y = (c / (a + b + c))

  return (
  <div className="model__content answer">
    <OutputField label="Summary">
    {summaryText}
    </OutputField>
    <div className="te-output">
    <TeGraph x={x} y={y}/>
    <div className="te-table">
      <table>
      <thead>
        <tr>
        <th>Judgment</th>
        <th>Probability</th>
        </tr>
      </thead>
      <tbody>
        <tr>
        <td>Entailment</td>
        <td>{formatProb(entailment)}</td>
        </tr>
        <tr>
        <td>Contradiction</td>
        <td>{formatProb(contradiction)}</td>
        </tr>
        <tr>
        <td>Neutral</td>
        <td>{formatProb(neutral)}</td>
        </tr>
      </tbody>
      </table>
    </div>
    </div>
    <OutputField>
      <Accordion accordion={false}>
        <SaliencyComponent interpretData={interpretData} input1Tokens={premise_tokens} input2Tokens={hypothesis_tokens} interpretModel = {interpretModel} requestData = {requestData} interpreter={GRAD_INTERPRETER} task={title}/>
        <SaliencyComponent interpretData={interpretData} input1Tokens={premise_tokens} input2Tokens={hypothesis_tokens} interpretModel = {interpretModel} requestData = {requestData} interpreter={IG_INTERPRETER} task={title}/>
        <SaliencyComponent interpretData={interpretData} input1Tokens={premise_tokens} input2Tokens={hypothesis_tokens} interpretModel = {interpretModel} requestData = {requestData} interpreter={SG_INTERPRETER} task={title}/>
        <InputReductionComponent inputReductionData={attackData} reduceInput={attackModel} requestDataObject={requestData} attacker={INPUT_REDUCTION_ATTACKER} nameOfInputToAttack={NAME_OF_INPUT_TO_ATTACK} nameOfGradInput={NAME_OF_GRAD_INPUT}/>
        <HotflipComponent hotflipData={attackData} hotflipInput={attackModel} requestDataObject={requestData} task={title} attacker={HOTFLIP_ATTACKER} nameOfInputToAttack={NAME_OF_INPUT_TO_ATTACK} nameOfGradInput={NAME_OF_GRAD_INPUT}/>

        <AccordionItem expanded={true}>
          <AccordionItemTitle>
            Premise to Hypothesis Attention
            <div className="accordion__arrow" role="presentation"/>
          </AccordionItemTitle>
          <AccordionItemBody>
            <p>
                For every premise word, the model computes an attention over the hypothesis words.
                This heatmap shows that attention, which is normalized for every row in the matrix.
            </p>
            <HeatMap colLabels={premise_tokens} rowLabels={hypothesis_tokens} data={h2p_attention} />
          </AccordionItemBody>
        </AccordionItem>
        <AccordionItem>
          <AccordionItemTitle>
            Hypothesis to Premise Attention
            <div className="accordion__arrow" role="presentation"/>
          </AccordionItemTitle>
          <AccordionItemBody>
            <p>
              For every hypothesis word, the model computes an attention over the premise words.
              This heatmap shows that attention, which is normalized for every row in the matrix.
            </p>
            <HeatMap colLabels={hypothesis_tokens} rowLabels={premise_tokens} data={p2h_attention} />
          </AccordionItemBody>
        </AccordionItem>

      </Accordion>
    </OutputField>
  </div>
  );
}

const examples = [
  {
    premise: "If you help the needy, God will reward you.",
    hypothesis: "Giving money to the poor has good consequences.",
  },
  {
    premise: "Two women are wandering along the shore drinking iced tea.",
    hypothesis: "Two women are sitting on a blanket near some rocks talking about politics.",
  },
  {
    premise: "An interplanetary spacecraft is in orbit around a gas giant's icy moon.",
    hypothesis: "The spacecraft has the ability to travel between planets.",
  },
  {
    premise: "A large, gray elephant walked beside a herd of zebras.",
    hypothesis: "The elephant was lost.",
  },
  {
    premise: "A handmade djembe was on display at the Smithsonian.",
    hypothesis: "Visitors could see the djembe.",
  },
]

const modelProps = {apiUrl, apiUrlInterpret, apiUrlAttack, title, description, descriptionEllipsed, fields, examples, Output}
export default withRouter(props => <Model {...props} {...modelProps}/>)
