import {
  Accordion,
  AccordionItem,
  AccordionTrigger,
  AccordionContent,
  Badge,
} from "paxtools";

/** The progression view stacks one AccordionItem per bloco. */
export const Blocos = () => (
  <Accordion type="single" collapsible defaultValue="aprendizagem">
    <AccordionItem value="aprendizagem">
      <AccordionTrigger>Aprendizagem Contínua</AccordionTrigger>
      <AccordionContent>
        Explorar assuntos que você acha interessante e colocar o que aprendeu em
        prática nas atividades e nos projetos de serviço.
      </AccordionContent>
    </AccordionItem>
    <AccordionItem value="autonomia">
      <AccordionTrigger>Autonomia e Liderança</AccordionTrigger>
      <AccordionContent>
        Viver diferentes funções na patrulha, sabendo quando ajudar e quando é
        sua vez de liderar.
      </AccordionContent>
    </AccordionItem>
    <AccordionItem value="saude">
      <AccordionTrigger>Saúde e Bem-Estar</AccordionTrigger>
      <AccordionContent>
        Cuidar do corpo e da mente, mantendo hábitos saudáveis dentro e fora das
        atividades escoteiras.
      </AccordionContent>
    </AccordionItem>
  </Accordion>
);

/** `type="multiple"` lets several blocos stay open at once. */
export const MultiplosAbertos = () => (
  <Accordion type="multiple" defaultValue={["um", "dois"]}>
    <AccordionItem value="um">
      <AccordionTrigger>
        <span className="flex items-center gap-2">
          Cidadania e Participação
          <Badge variant="secondary">4/6</Badge>
        </span>
      </AccordionTrigger>
      <AccordionContent>
        Participar das decisões da tropa e contribuir com a comunidade.
      </AccordionContent>
    </AccordionItem>
    <AccordionItem value="dois">
      <AccordionTrigger>
        <span className="flex items-center gap-2">
          Natureza e Sustentabilidade
          <Badge>Completo</Badge>
        </span>
      </AccordionTrigger>
      <AccordionContent>
        Conhecer e proteger o ambiente natural durante acampamentos e excursões.
      </AccordionContent>
    </AccordionItem>
  </Accordion>
);

export const Fechado = () => (
  <Accordion type="single" collapsible>
    <AccordionItem value="a">
      <AccordionTrigger>Habilidades para a Vida</AccordionTrigger>
      <AccordionContent>Conteúdo do bloco.</AccordionContent>
    </AccordionItem>
    <AccordionItem value="b">
      <AccordionTrigger>Serviço à Comunidade</AccordionTrigger>
      <AccordionContent>Conteúdo do bloco.</AccordionContent>
    </AccordionItem>
  </Accordion>
);
